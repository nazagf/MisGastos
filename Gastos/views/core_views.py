import json

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from Gastos.auth import owner_required


@owner_required
@ensure_csrf_cookie
def inicio(request):
    """Sirve el dashboard (frontend de una sola página)."""
    return render(request, 'Gastos/index.html')


def leer_json(request):
    """Devuelve el cuerpo JSON de la request como dict (o {} si está vacío)."""
    if not request.body:
        return {}
    if request.content_type != 'application/json':
        raise ValueError('Enviá el contenido como application/json.')
    try:
        data = json.loads(request.body.decode('utf-8'), parse_constant=_invalid_constant)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError('El JSON enviado no es válido.') from error
    if not isinstance(data, dict):
        raise ValueError('El JSON debe ser un objeto.')
    return data


def _invalid_constant(value):
    raise ValueError('Los números deben ser finitos.')


def csrf_failure(request, reason=''):
    if request.path.startswith('/api/'):
        return JsonResponse({'error': 'La sesión o el token de seguridad venció. Recargá la página.'}, status=403)
    return render(request, 'Gastos/csrf_failure.html', status=403)
