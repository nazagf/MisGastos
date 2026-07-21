from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from Gastos.services import GastoService, PresupuestoService, ConfiguracionService
from .core_views import leer_json

gasto_service = GastoService()
presupuesto_service = PresupuestoService()
configuracion_service = ConfiguracionService()


@csrf_exempt
def expenses_collection(request):
    if request.method == 'GET':
        return JsonResponse(gasto_service.listar(), safe=False)

    if request.method == 'POST':
        try:
            gasto = gasto_service.crear(leer_json(request))
            return JsonResponse(GastoService.serializar(gasto), status=201)
        except (KeyError, ValueError, TypeError) as err:
            return JsonResponse({'error': f'Datos inválidos: {err}'}, status=400)

    if request.method == 'DELETE':
        # 'Borrar todo' del frontend pega a DELETE /api/expenses y espera que se
        # limpien gastos, presupuestos y configuración (ver static/Gastos/js/export.js).
        gasto_service.eliminar_todos()
        presupuesto_service.eliminar_todos()
        configuracion_service.eliminar_todos()
        return JsonResponse({'success': True})

    return HttpResponse(status=405)


@csrf_exempt
def expense_detail(request, expense_id):
    if request.method == 'PUT':
        try:
            gasto = gasto_service.actualizar(expense_id, leer_json(request))
        except (KeyError, ValueError, TypeError) as err:
            return JsonResponse({'error': f'Datos inválidos: {err}'}, status=400)
        if gasto is None:
            return JsonResponse({'error': 'Gasto no encontrado'}, status=404)
        return JsonResponse(GastoService.serializar(gasto))

    if request.method == 'DELETE':
        if not gasto_service.eliminar(expense_id):
            return JsonResponse({'error': 'Gasto no encontrado'}, status=404)
        return JsonResponse({'success': True})

    return HttpResponse(status=405)
