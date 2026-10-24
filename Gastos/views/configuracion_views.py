from django.http import JsonResponse

from Gastos.services import ConfiguracionService
from .core_views import leer_json
from .api import api_endpoint

configuracion_service = ConfiguracionService()


@api_endpoint(['GET', 'POST'])
def settings_view(request):
    if request.method == 'GET':
        return JsonResponse(configuracion_service.obtener())

    return JsonResponse(configuracion_service.guardar(leer_json(request)))
