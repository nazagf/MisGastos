from functools import wraps

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from Gastos.auth import owner_required


def api_endpoint(methods):
    def decorate(view):
        @owner_required
        @require_http_methods(methods)
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            try:
                return view(request, *args, **kwargs)
            except ValidationError as error:
                return JsonResponse({'error': ' '.join(error.messages)}, status=400)
            except (ValueError, TypeError, KeyError):
                return JsonResponse({'error': 'Datos inválidos. Revisá los campos enviados.'}, status=400)
        return wrapped
    return decorate
