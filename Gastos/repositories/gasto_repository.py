from Gastos.models import Gasto


class GastoRepository:

    def get_all(self):
        return Gasto.objects.all()

    def get_by_id(self, id_gasto):
        try:
            return Gasto.objects.get(pk=id_gasto)
        except Gasto.DoesNotExist:
            return None

    def save(self, gasto):
        gasto.save()
        return gasto

    def delete(self, gasto):
        gasto.delete()

    def delete_all(self):
        Gasto.objects.all().delete()

    def buscar_por_categoria(self, categoria):
        return Gasto.objects.filter(Categoria=categoria)
