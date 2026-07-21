from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from Gastos.services import PresupuestoService
from .core_views import leer_json

presupuesto_service = PresupuestoService()


@csrf_exempt
def budgets_collection(request):
    if request.method == 'GET':
        return JsonResponse(presupuesto_service.listar_como_dict())

    if request.method == 'POST':
        try:
            return JsonResponse(presupuesto_service.guardar(leer_json(request)))
        except (KeyError, ValueError, TypeError) as err:
            return JsonResponse({'error': f'Datos inválidos: {err}'}, status=400)

    return HttpResponse(status=405)
