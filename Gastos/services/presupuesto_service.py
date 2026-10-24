from Gastos.models import Presupuesto
from Gastos.repositories.presupuesto_repository import PresupuestoRepository
from Gastos.validation import budget_data


class PresupuestoService:
    def __init__(self):
        self.presupuesto_repo = PresupuestoRepository()

    def listar_como_dict(self):
        # El frontend espera un objeto { '<AnioMes>': { total, categories } }.
        return {
            p.AnioMes: {'total': float(p.Total), 'categories': p.Categorias}
            for p in self.presupuesto_repo.get_all()
        }

    def guardar(self, datos):
        fields = budget_data(datos)
        key = fields.pop('AnioMes')
        presupuesto, _ = Presupuesto.objects.update_or_create(AnioMes=key, defaults=fields)
        return {'total': float(presupuesto.Total), 'categories': presupuesto.Categorias}

    def eliminar_todos(self):
        self.presupuesto_repo.delete_all()
