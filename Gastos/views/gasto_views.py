from django.http import JsonResponse

from Gastos.services import GastoService
from Gastos.services.datos_service import clear_data
from .api import api_endpoint
from .core_views import leer_json


gasto_service = GastoService()


@api_endpoint(['GET', 'POST', 'DELETE'])
def expenses_collection(request):
    if request.method == 'GET':
        return JsonResponse(gasto_service.listar(), safe=False)
    if request.method == 'POST':
        gasto = gasto_service.crear(leer_json(request))
        return JsonResponse(GastoService.serializar(gasto), status=201)
    clear_data()
    return JsonResponse({'success': True})


@api_endpoint(['PUT', 'DELETE'])
def expense_detail(request, expense_id):
    if request.method == 'PUT':
        gasto = gasto_service.actualizar(expense_id, leer_json(request))
        if gasto is None:
            return JsonResponse({'error': 'Gasto no encontrado'}, status=404)
        return JsonResponse(GastoService.serializar(gasto))
    if not gasto_service.eliminar(expense_id):
        return JsonResponse({'error': 'Gasto no encontrado'}, status=404)
    return JsonResponse({'success': True})
