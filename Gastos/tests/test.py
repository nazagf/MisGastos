import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import IntegrityError, transaction
from django.test import Client, SimpleTestCase, TestCase

from Gastos.models import Gasto, Presupuesto
from Gastos.services import GastoService, PresupuestoService, ConfiguracionService
from Gastos.services.datos_service import import_data
from Proyecto.config import database_config, load_env


def expense(**updates):
    return {'id': 'g1', 'description': 'Café', 'amount': '3500.25',
            'category': 'alimentos', 'paymentMethod': 'efectivo',
            'date': '2026-07-18', 'notes': '', **updates}


class OwnerTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_superuser('owner', password='ClaveDePrueba-237!')
        cls.other = get_user_model().objects.create_user('other', password='ClaveDePrueba-237!')

    def setUp(self):
        self.client.force_login(self.owner)

    def post_json(self, path, data, method='post'):
        return getattr(self.client, method)(path, json.dumps(data), content_type='application/json')


class AccessTests(OwnerTestCase):
    def test_anonymous_cannot_read_or_change_finances(self):
        GastoService().crear(expense())
        self.client.logout()
        for path in ['/api/expenses', '/api/budgets', '/api/settings', '/api/backup']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)
                self.assertEqual(self.post_json(path, {}).status_code, 401)
        self.assertEqual(self.client.delete('/api/expenses').status_code, 401)
        self.assertEqual(Gasto.objects.count(), 1)
        self.assertRedirects(self.client.get('/'), '/login/?next=/', fetch_redirect_response=False)

    def test_non_owner_cannot_read_or_delete(self):
        self.client.force_login(self.other)
        for path in ['/api/expenses', '/api/budgets', '/api/settings', '/api/backup']:
            self.assertEqual(self.client.get(path).status_code, 403)
            self.assertEqual(self.post_json(path, {}).status_code, 403)
        self.assertEqual(self.client.delete('/api/expenses').status_code, 403)
        self.assertEqual(self.post_json('/api/expenses/g1', expense(), 'put').status_code, 403)
        self.assertEqual(self.client.get('/').status_code, 403)

    def test_csrf_enforced_on_every_write_endpoint(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.owner)
        for path in ['/api/expenses', '/api/budgets', '/api/settings', '/api/backup']:
            with self.subTest(path=path):
                response = client.post(path, '{}', content_type='application/json')
                self.assertEqual(response.status_code, 403)
                self.assertIn('error', response.json())
        self.assertEqual(client.delete('/api/expenses').status_code, 403)
        self.assertEqual(client.put('/api/expenses/g1', '{}', content_type='application/json').status_code, 403)
        self.assertEqual(client.delete('/api/expenses/g1').status_code, 403)
        self.assertEqual(Gasto.objects.count(), 0)

    def test_owner_can_write_with_csrf_then_logout(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.owner)
        page = client.get('/')
        self.assertContains(page, 'csrf-token')
        token = client.cookies['csrftoken'].value
        response = client.post('/api/expenses', json.dumps(expense()),
                               content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        self.assertIn('no-store', response.headers['Cache-Control'])
        self.assertEqual(client.get('/logout/').status_code, 405)
        self.assertEqual(client.post('/logout/', HTTP_X_CSRFTOKEN=token).status_code, 302)
        self.assertEqual(client.get('/api/expenses').status_code, 401)

    def test_login_accepts_owner_and_rejects_normal_account(self):
        self.client.logout()
        response = self.client.post('/login/', {'username': 'other', 'password': 'ClaveDePrueba-237!'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/expenses').status_code, 401)
        response = self.client.post('/login/', {'username': 'owner', 'password': 'ClaveDePrueba-237!'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.client.get('/api/expenses').status_code, 200)


class ExpenseTests(OwnerTestCase):
    def test_create_update_and_delete(self):
        response = self.post_json('/api/expenses', expense())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['amount'], 3500.25)
        self.assertEqual(Gasto.objects.get().Monto, Decimal('3500.25'))
        response = self.post_json('/api/expenses/g1', expense(amount='0.01'), 'put')
        self.assertEqual(response.json()['amount'], 0.01)
        self.assertEqual(self.client.delete('/api/expenses/g1').status_code, 200)
        self.assertEqual(self.client.delete('/api/expenses/g1').status_code, 404)

    def test_invalid_fields_never_create_a_record(self):
        invalid = [dict(amount=value) for value in [0, -1, True, None, 'NaN', 'Infinity', '1.001', '10000000000']]
        invalid += [dict(date=value) for value in ['no-es-fecha', '2026-02-30', '20260701']]
        invalid += [dict(category='desconocida'), dict(category=[]), dict(paymentMethod='bitcoin'),
                    dict(description=' '), dict(description='x' * 256), dict(id="x' onclick='alert(1)"),
                    dict(notes='x' * 5001)]
        for fields in invalid:
            with self.subTest(fields=fields):
                self.assertEqual(self.post_json('/api/expenses', expense(**fields)).status_code, 400)
        self.assertEqual(Gasto.objects.count(), 0)

    def test_invalid_json_returns_400(self):
        for path in ['/api/expenses', '/api/budgets', '/api/settings', '/api/backup']:
            for body in ['[1,2]', 'null', '{bad}', '{"amount":NaN}']:
                with self.subTest(path=path, body=body):
                    self.assertEqual(self.client.post(path, body, content_type='application/json').status_code, 400)

    def test_invalid_update_keeps_previous_value(self):
        GastoService().crear(expense())
        response = self.post_json('/api/expenses/g1', expense(amount=-20), 'put')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Gasto.objects.get().Monto, Decimal('3500.25'))

    def test_clear_all_is_owner_only_and_clears_all_three_entities(self):
        GastoService().crear(expense())
        PresupuestoService().guardar({'yearMonth': '2026-6', 'total': 500000, 'categories': {'alimentos': 200000}})
        ConfiguracionService().guardar({'settings': {'theme': 'gold'}})
        self.assertEqual(self.client.delete('/api/expenses').status_code, 200)
        self.assertEqual(self.client.get('/api/backup').json(),
                         {'version': 1, 'expenses': [], 'budgets': {}, 'settings': {}})

    def test_database_rejects_nonpositive_amount(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Gasto.objects.create(**{'id_gasto': 'bad', 'Descripcion': 'Bad', 'Monto': -1,
                                   'Categoria': 'otros', 'MetodoPago': 'efectivo', 'Fecha': '2026-07-01'})


class BudgetTests(OwnerTestCase):
    def test_invalid_budgets_rejected(self):
        valid = {'yearMonth': '2026-6', 'total': 5000, 'categories': {}}
        for updates in [{'yearMonth': '2026-12'}, {'total': -1}, {'categories': {'otros': -1}},
                        {'categories': {'desconocida': 2}}, {'categories': []}, {'total': '1.001'}]:
            with self.subTest(updates=updates):
                self.assertEqual(self.post_json('/api/budgets', {**valid, **updates}).status_code, 400)
        self.assertEqual(Presupuesto.objects.count(), 0)

    def test_budget_supports_zero_and_cents(self):
        for total in ['0', '24.75']:
            response = self.post_json('/api/budgets', {'yearMonth': '2026-6', 'total': total, 'categories': {'otros': 0}})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['total'], float(total))


class ImportTests(OwnerTestCase):
    def setUp(self):
        super().setUp()
        GastoService().crear(expense())

    def test_bad_record_leaves_old_data_untouched(self):
        data = {'expenses': [expense(id='new'), expense(id='invalid', amount=-1)]}
        self.assertEqual(self.post_json('/api/backup', {'mode': 'replace', 'data': data}).status_code, 400)
        self.assertEqual(list(Gasto.objects.values_list('pk', flat=True)), ['g1'])

    def test_duplicate_ids_and_invalid_shapes_are_rejected(self):
        for data in [{'expenses': [expense(), expense()]}, {'expenses': [] , 'settings': []},
                     {'expenses': 'invalid'}, None]:
            self.assertEqual(self.post_json('/api/backup', {'mode': 'replace', 'data': data}).status_code, 400)
        self.assertEqual(Gasto.objects.count(), 1)

    def test_restore_replaces_entire_snapshot(self):
        data = {'expenses': [expense(id='restored')],
                'budgets': {'2026-6': {'total': 50000, 'categories': {'alimentos': 10.25}}},
                'settings': {'theme': 'gold'}}
        response = self.post_json('/api/backup', {'mode': 'replace', 'data': data})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.json()['expenses']], ['restored'])
        self.assertEqual(response.json()['budgets'], data['budgets'])
        self.assertEqual(response.json()['settings'], data['settings'])

    def test_merge_retains_existing_records_and_settings(self):
        ConfiguracionService().guardar({'settings': {'theme': 'gold'}})
        response = self.post_json('/api/backup', {'mode': 'merge', 'data': {'expenses': [expense(id='new')]}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Gasto.objects.count(), 2)
        self.assertEqual(response.json()['settings'], {'theme': 'gold'})

    def test_database_error_rolls_back_deletion(self):
        with patch.object(Gasto.objects, 'bulk_create', side_effect=IntegrityError('forced failure')):
            with self.assertRaises(IntegrityError):
                import_data({'expenses': [expense(id='new')]}, replace=True)
        self.assertTrue(Gasto.objects.filter(pk='g1').exists())


class ConfigurationTests(SimpleTestCase):
    def test_production_requires_private_key_and_specific_hosts(self):
        valid = {**os.environ, 'DJANGO_ENV_FILE': '/dev/null', 'DJANGO_DEBUG': 'False',
                 'DJANGO_SECRET_KEY': 'test-only-production-' + 'x' * 64,
                 'DJANGO_ALLOWED_HOSTS': 'gastos.example.test',
                 'DATABASE_URL': 'postgresql://test:test@localhost/test'}
        for changes in [{}, {'DJANGO_SECRET_KEY': ''}, {'DJANGO_SECRET_KEY': 'dev-insecure-change-me'},
                        {'DJANGO_ALLOWED_HOSTS': '*'}, {'DJANGO_ALLOWED_HOSTS': ''}]:
            with self.subTest(changes=changes):
                result = subprocess.run([sys.executable, '-c', 'import Proyecto.settings'],
                                        env={**valid, **changes}, capture_output=True, check=False)
                self.assertEqual(result.returncode == 0, not changes)

    def test_tls_options_and_escaped_credentials_are_preserved(self):
        config = database_config('postgresql://user:p%40ss@db.example/test?sslmode=verify-full&sslrootcert=/tmp/ca.pem')
        self.assertEqual(config['PASSWORD'], 'p@ss')
        self.assertEqual(config['OPTIONS']['sslmode'], 'verify-full')
        self.assertEqual(config['OPTIONS']['sslrootcert'], '/tmp/ca.pem')

    def test_unknown_database_options_fail_closed(self):
        with self.assertRaises(ImproperlyConfigured):
            database_config('postgresql://host/db?ssmode=require')

    def test_env_quotes_and_process_priority(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / '.env'
            path.write_text('KEY="quoted value"\nPRIORITY=from-file\n# comment\n')
            environ = {'PRIORITY': 'from-service'}
            load_env(path, environ)
            self.assertEqual(environ, {'KEY': 'quoted value', 'PRIORITY': 'from-service'})
