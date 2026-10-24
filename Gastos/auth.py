"""Acceso privado de la persona dueña; no existe registro público."""
from functools import wraps

from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import ValidationError
from django.http import HttpResponseForbidden, JsonResponse
from django.utils.cache import add_never_cache_headers


class OwnerAuthenticationForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if not user.is_superuser:
            raise ValidationError(self.error_messages['invalid_login'], code='invalid_login',
                                  params={'username': self.username_field.verbose_name})


def owner_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        api = request.path.startswith('/api/')
        if not request.user.is_authenticated:
            response = (JsonResponse({'error': 'Iniciá sesión para continuar.'}, status=401)
                        if api else redirect_to_login(request.get_full_path()))
        elif not request.user.is_superuser:
            response = (JsonResponse({'error': 'Acceso no autorizado.'}, status=403)
                        if api else HttpResponseForbidden('Acceso no autorizado.'))
        else:
            response = view(request, *args, **kwargs)
        add_never_cache_headers(response)
        return response
    return wrapped
