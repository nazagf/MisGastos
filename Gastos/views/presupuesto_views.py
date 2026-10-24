from django.http import JsonResponse

from Gastos.services import PresupuestoService
from .api import api_endpoint
from .core_views import leer_json


presupuesto_service = PresupuestoService()


@api_endpoint(['GET', 'POST'])
def budgets_collection(request):
    if request.method == 'GET':
        return JsonResponse(presupuesto_service.listar_como_dict())
    return JsonResponse(presupuesto_service.guardar(leer_json(request)))
