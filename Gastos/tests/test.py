import json

from django.test import TestCase, Client

from Gastos.services import GastoService, PresupuestoService, ConfiguracionService


class GastoServiceTest(TestCase):
    def setUp(self):
        self.service = GastoService()

    def test_crear_y_listar(self):
        self.service.crear({
            'id': 'abc123',
            'description': 'Supermercado',
            'amount': 15000,
            'category': 'alimentos',
            'paymentMethod': 'debito',
            'date': '2026-07-15',
            'notes': '',
        })
        gastos = self.service.listar()
        self.assertEqual(len(gastos), 1)
        self.assertEqual(gastos[0]['description'], 'Supermercado')
        self.assertEqual(gastos[0]['amount'], 15000.0)

    def test_eliminar(self):
        self.service.crear({
            'id': 'x1', 'description': 'Nafta', 'amount': 32000,
            'category': 'transporte', 'paymentMethod': 'debito', 'date': '2026-07-10',
        })
        self.assertTrue(self.service.eliminar('x1'))
        self.assertEqual(len(self.service.listar()), 0)


class BorrarTodoApiTest(TestCase):
    """DELETE /api/expenses debe limpiar gastos, presupuestos y configuración
    (lo que promete el botón 'Borrar Todo' del frontend)."""

    def test_borrar_todo(self):
        client = Client()
        GastoService().crear({
            'id': 'g1', 'description': 'Cafe', 'amount': 3500,
            'category': 'alimentos', 'paymentMethod': 'efectivo', 'date': '2026-07-18',
        })
        PresupuestoService().guardar(
            {'yearMonth': '2026-6', 'total': 500000, 'categories': {'alimentos': 200000}}
        )
        ConfiguracionService().guardar({'settings': {'theme': 'gold'}})

        resp = client.delete('/api/expenses')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(json.loads(resp.content), {'success': True})

        self.assertEqual(GastoService().listar(), [])
        self.assertEqual(PresupuestoService().listar_como_dict(), {})
        self.assertEqual(ConfiguracionService().obtener(), {})


class FechaInvalidaTest(TestCase):
    def test_post_fecha_invalida_devuelve_400(self):
        client = Client()
        resp = client.post(
            '/api/expenses',
            data=json.dumps({
                'id': 'z1', 'description': 'X', 'amount': 100,
                'category': 'otros', 'paymentMethod': 'efectivo', 'date': 'no-es-fecha',
            }),
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 400)
