from Gastos.models import Presupuesto
from Gastos.repositories.presupuesto_repository import PresupuestoRepository


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
        presupuesto = self.presupuesto_repo.get_by_anio_mes(datos['yearMonth'])
        if presupuesto is None:
            presupuesto = Presupuesto(AnioMes=datos['yearMonth'])
        presupuesto.Total = datos['total']
        presupuesto.Categorias = datos.get('categories', {})
        self.presupuesto_repo.save(presupuesto)
        return {'total': float(presupuesto.Total), 'categories': presupuesto.Categorias}

    def eliminar_todos(self):
        self.presupuesto_repo.delete_all()
