from django.utils import timezone
from django.utils.dateparse import parse_date

from Gastos.models import Gasto
from Gastos.repositories.gasto_repository import GastoRepository


class GastoService:
    def __init__(self):
        self.gasto_repo = GastoRepository()

    def listar(self):
        return [self.serializar(g) for g in self.gasto_repo.get_all()]

    def crear(self, datos):
        # update_or_create para que la re-importación de datos no rompa por id repetido.
        gasto = self.gasto_repo.get_by_id(datos['id'])
        if gasto is None:
            gasto = Gasto(id_gasto=datos['id'])
        self._asignar(gasto, datos)
        return self.gasto_repo.save(gasto)

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
        fecha = parse_date(datos['date'])
        if fecha is None:
            raise ValueError(f"Fecha inválida: {datos.get('date')!r}")
        gasto.Descripcion = datos['description']
        gasto.Monto = datos['amount']
        gasto.Categoria = datos['category']
        gasto.MetodoPago = datos.get('paymentMethod', '')
        gasto.Fecha = fecha
        gasto.Notas = datos.get('notes', '')

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
