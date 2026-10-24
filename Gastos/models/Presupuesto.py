from django.db import models


class Presupuesto(models.Model):
    id_presupuesto = models.AutoField(primary_key=True)
    # AnioMes es la clave que envía el front: '<año>-<mes 0-index>' (ej. '2026-6').
    AnioMes = models.CharField(max_length=7, unique=True)
    Total = models.DecimalField(max_digits=12, decimal_places=2)
    Categorias = models.JSONField(default=dict)

    class Meta:
        ordering = ['AnioMes']
        constraints = [models.CheckConstraint(condition=models.Q(Total__gte=0), name='presupuesto_total_no_negativo')]

    def __str__(self):
        return f"Presupuesto {self.AnioMes}"
