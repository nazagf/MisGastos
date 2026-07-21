from django.db import models


class Configuracion(models.Model):
    Clave = models.CharField(primary_key=True, max_length=50)
    Valor = models.JSONField(default=dict)

    def __str__(self):
        return self.Clave
