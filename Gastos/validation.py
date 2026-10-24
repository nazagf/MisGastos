"""Validación del contrato JSON, también usada por las importaciones."""
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

CATEGORIES = {'tarjetas', 'servicios', 'alimentos', 'productos', 'transporte',
              'salud', 'educacion', 'entretenimiento', 'otros'}
PAYMENT_METHODS = {'efectivo', 'debito', 'credito', 'transferencia'}
MAX_AMOUNT = Decimal('9999999999.99')
MAX_IMPORT_ITEMS = 2000


def object_value(value):
    if not isinstance(value, dict):
        raise ValidationError('Se esperaba un objeto JSON.')
    return value


def text(value, field, *, maximum, required=True):
    if not isinstance(value, str):
        raise ValidationError(f'{field}: se esperaba texto.')
    value = value.strip()
    if (required and not value) or len(value) > maximum or '\x00' in value:
        raise ValidationError(f'{field}: revisá el contenido y el límite de {maximum} caracteres.')
    return value


def money(value, field, *, allow_zero=False):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValidationError(f'{field}: ingresá un monto válido.')
    try:
        amount = Decimal(str(value))
    except InvalidOperation as error:
        raise ValidationError(f'{field}: ingresá un monto válido.') from error
    if (not amount.is_finite() or amount < 0 or amount > MAX_AMOUNT
            or (not allow_zero and amount == 0)):
        raise ValidationError(f'{field}: monto fuera de rango.')
    if amount != amount.quantize(Decimal('0.01')):
        raise ValidationError(f'{field}: se permiten hasta dos decimales.')
    return amount.quantize(Decimal('0.01'))


def expense_data(data):
    object_value(data)
    identifier = text(data.get('id'), 'Identificador', maximum=50)
    if not re.fullmatch(r'[A-Za-z0-9_-]+', identifier):
        raise ValidationError('Identificador de gasto inválido.')
    category = data.get('category')
    payment = data.get('paymentMethod')
    if not isinstance(category, str) or category not in CATEGORIES:
        raise ValidationError('Elegí una categoría válida.')
    if not isinstance(payment, str) or payment not in PAYMENT_METHODS:
        raise ValidationError('Elegí un medio de pago válido.')
    raw_date = data.get('date')
    if not isinstance(raw_date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw_date):
        raise ValidationError('Fecha inválida. Usá AAAA-MM-DD.')
    try:
        parsed_date = date.fromisoformat(raw_date)
    except ValueError as error:
        raise ValidationError('La fecha indicada no existe.') from error
    return {
        'id_gasto': identifier,
        'Descripcion': text(data.get('description'), 'Descripción', maximum=255),
        'Monto': money(data.get('amount'), 'Monto'),
        'Categoria': category,
        'MetodoPago': payment,
        'Fecha': parsed_date,
        'Notas': text(data.get('notes', ''), 'Notas', maximum=5000, required=False),
    }


def budget_data(data):
    object_value(data)
    key = data.get('yearMonth')
    if not isinstance(key, str) or not re.fullmatch(r'[1-9]\d{3}-(?:[0-9]|1[01])', key):
        raise ValidationError('Mes inválido: el mes del contrato va de 0 a 11.')
    categories = object_value(data.get('categories', {}))
    if categories.keys() - CATEGORIES:
        raise ValidationError('El presupuesto incluye categorías desconocidas.')
    return {
        'AnioMes': key,
        'Total': money(data.get('total'), 'Presupuesto total', allow_zero=True),
        'Categorias': {key: float(money(value, 'Presupuesto por categoría', allow_zero=True))
                       for key, value in categories.items()},
    }


def backup_data(data):
    object_value(data)
    if data.get('version', 1) != 1:
        raise ValidationError('Versión de backup no admitida.')
    expenses = data.get('expenses')
    budgets = object_value(data.get('budgets', {}))
    settings = object_value(data.get('settings', {}))
    if not isinstance(expenses, list) or len(expenses) > MAX_IMPORT_ITEMS or len(budgets) > MAX_IMPORT_ITEMS:
        raise ValidationError(f'Importá como máximo {MAX_IMPORT_ITEMS} gastos y presupuestos por archivo.')
    cleaned_expenses = [expense_data(item) for item in expenses]
    if len({item['id_gasto'] for item in cleaned_expenses}) != len(cleaned_expenses):
        raise ValidationError('El archivo contiene identificadores de gasto duplicados.')
    cleaned_budgets = [budget_data({**object_value(item), 'yearMonth': key})
                       for key, item in budgets.items()]
    return cleaned_expenses, cleaned_budgets, settings
