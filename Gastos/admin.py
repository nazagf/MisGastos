from django.contrib import admin
from Gastos.models import Gasto, Presupuesto, Configuracion


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ('Descripcion', 'Monto', 'Categoria', 'MetodoPago', 'Fecha')
    list_filter = ('Categoria', 'MetodoPago', 'Fecha')
    search_fields = ('Descripcion', 'Notas')
    date_hierarchy = 'Fecha'


@admin.register(Presupuesto)
class PresupuestoAdmin(admin.ModelAdmin):
    list_display = ('AnioMes', 'Total')


@admin.register(Configuracion)
class ConfiguracionAdmin(admin.ModelAdmin):
    list_display = ('Clave',)
