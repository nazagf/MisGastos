"""Importación validada y atómica: un error conserva todos los datos anteriores."""
from django.db import transaction
from django.utils import timezone

from Gastos.models import Gasto, Presupuesto
from Gastos.validation import backup_data
from .gasto_service import GastoService
from .presupuesto_service import PresupuestoService
from .configuracion_service import ConfiguracionService


def snapshot():
    return {'version': 1, 'expenses': GastoService().listar(),
            'budgets': PresupuestoService().listar_como_dict(),
            'settings': ConfiguracionService().obtener()}


@transaction.atomic
def clear_data():
    GastoService().eliminar_todos()
    PresupuestoService().eliminar_todos()
    ConfiguracionService().eliminar_todos()


@transaction.atomic
def import_data(data, *, replace):
    expenses, budgets, settings = backup_data(data)
    if replace:
        clear_data()
    Gasto.objects.bulk_create(
        [Gasto(**fields, ActualizadoEn=timezone.now()) for fields in expenses],
        update_conflicts=True,
        update_fields=['Descripcion', 'Monto', 'Categoria', 'MetodoPago', 'Fecha', 'Notas', 'ActualizadoEn'],
        unique_fields=['id_gasto'], batch_size=500,
    )
    Presupuesto.objects.bulk_create(
        [Presupuesto(**fields) for fields in budgets], update_conflicts=True,
        update_fields=['Total', 'Categorias'], unique_fields=['AnioMes'], batch_size=500,
    )
    if replace or 'settings' in data:
        ConfiguracionService().guardar({'settings': settings})
    return snapshot()
