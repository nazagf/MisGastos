from django.utils import timezone

from Gastos.models import Gasto
from Gastos.repositories.gasto_repository import GastoRepository
from Gastos.validation import expense_data


class GastoService:
    def __init__(self):
        self.gasto_repo = GastoRepository()

    def listar(self):
        return [self.serializar(g) for g in self.gasto_repo.get_all()]

    def crear(self, datos):
        fields = expense_data(datos)
        identifier = fields.pop('id_gasto')
        gasto, _ = Gasto.objects.update_or_create(pk=identifier, defaults=fields)
        return gasto

    def actualizar(self, id_gasto, datos):
        gasto = self.gasto_repo.get_by_id(id_gasto)
        if gasto is None:
            return None
        self._asignar(gasto, datos)
        gasto.ActualizadoEn = timezone.now()
        return self.gasto_repo.save(gasto)

    def eliminar(self, id_gasto):
        gasto = self.gasto_repo.get_by_id(id_gasto)
        if gasto is None:
            return False
        self.gasto_repo.delete(gasto)
        return True

    def eliminar_todos(self):
        self.gasto_repo.delete_all()

    def _asignar(self, gasto, datos):
        for field, value in expense_data({**datos, 'id': gasto.pk}).items():
            setattr(gasto, field, value)

    @staticmethod
    def serializar(gasto):
        return {
            'id': gasto.id_gasto,
            'description': gasto.Descripcion,
            'amount': float(gasto.Monto),
            'category': gasto.Categoria,
            'paymentMethod': gasto.MetodoPago,
            'date': gasto.Fecha.isoformat(),
            'notes': gasto.Notas,
            'createdAt': gasto.CreadoEn.isoformat() if gasto.CreadoEn else None,
            'updatedAt': gasto.ActualizadoEn.isoformat() if gasto.ActualizadoEn else None,
        }
