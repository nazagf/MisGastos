from Gastos.models import Configuracion


class ConfiguracionRepository:

    def get_by_clave(self, clave):
        try:
            return Configuracion.objects.get(pk=clave)
        except Configuracion.DoesNotExist:
            return None

    def save(self, configuracion):
        configuracion.save()
        return configuracion

    def delete_all(self):
        Configuracion.objects.all().delete()
