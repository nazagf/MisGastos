from Gastos.models import Presupuesto


class PresupuestoRepository:

    def get_all(self):
        return Presupuesto.objects.all()

    def get_by_anio_mes(self, anio_mes):
        try:
            return Presupuesto.objects.get(AnioMes=anio_mes)
        except Presupuesto.DoesNotExist:
            return None

    def save(self, presupuesto):
        presupuesto.save()
        return presupuesto

    def delete_all(self):
        Presupuesto.objects.all().delete()
