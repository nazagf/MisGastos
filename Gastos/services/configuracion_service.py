from Gastos.models import Configuracion
from Gastos.repositories.configuracion_repository import ConfiguracionRepository
from Gastos.validation import object_value

CLAVE_USUARIO = 'user_settings'


class ConfiguracionService:
    def __init__(self):
        self.config_repo = ConfiguracionRepository()

    def obtener(self):
        config = self.config_repo.get_by_clave(CLAVE_USUARIO)
        return config.Valor if config else {}

    def guardar(self, datos):
        config = self.config_repo.get_by_clave(CLAVE_USUARIO)
        if config is None:
            config = Configuracion(Clave=CLAVE_USUARIO)
        config.Valor = object_value(object_value(datos).get('settings', {}))
        self.config_repo.save(config)
        return config.Valor

    def eliminar_todos(self):
        self.config_repo.delete_all()
