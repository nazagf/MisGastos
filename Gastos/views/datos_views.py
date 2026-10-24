from django.core.exceptions import ValidationError
from django.http import JsonResponse

from Gastos.services.datos_service import import_data, snapshot
from .api import api_endpoint
from .core_views import leer_json


@api_endpoint(['GET', 'POST'])
def backup_view(request):
    if request.method == 'GET':
        return JsonResponse(snapshot())
    payload = leer_json(request)
    mode = payload.get('mode')
    if mode not in ('replace', 'merge'):
        raise ValidationError('Elegí el modo replace o merge para importar.')
    return JsonResponse(import_data(payload.get('data'), replace=mode == 'replace'))
