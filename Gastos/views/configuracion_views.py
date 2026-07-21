from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from Gastos.services import ConfiguracionService
from .core_views import leer_json

configuracion_service = ConfiguracionService()


@csrf_exempt
def settings_view(request):
    if request.method == 'GET':
        return JsonResponse(configuracion_service.obtener())

    if request.method == 'POST':
        return JsonResponse(configuracion_service.guardar(leer_json(request)))

    return HttpResponse(status=405)
