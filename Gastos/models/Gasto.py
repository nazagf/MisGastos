from django.db import models


class Gasto(models.Model):
    # El id lo genera el frontend (cadena corta única), por eso no es AutoField.
    id_gasto = models.CharField(primary_key=True, max_length=50)
    Descripcion = models.CharField(max_length=255)
    Monto = models.DecimalField(max_digits=12, decimal_places=2)
    Categoria = models.CharField(max_length=50)
    MetodoPago = models.CharField(max_length=50)
    Fecha = models.DateField()
    Notas = models.TextField(blank=True, default='')
    CreadoEn = models.DateTimeField(auto_now_add=True)
    ActualizadoEn = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-Fecha', '-CreadoEn']

    def __str__(self):
        return f"{self.Descripcion} — {self.Monto}"
