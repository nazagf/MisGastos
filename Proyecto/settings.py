"""Configuración de Django para el proyecto MisGastos."""
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

from .config import database_config, load_env

BASE_DIR = Path(__file__).resolve().parent.parent

load_env(Path(os.environ.get('DJANGO_ENV_FILE', BASE_DIR / '.env')), os.environ)

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    raise ImproperlyConfigured('Definí DJANGO_SECRET_KEY antes de iniciar MisGastos.')
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith(('dev-', 'django-insecure-'))):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY debe ser una clave privada de al menos 50 caracteres.')
ALLOWED_HOSTS = [host.strip() for host in os.environ.get(
    'DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1' if DEBUG else ''
).split(',') if host.strip()]
if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
    raise ImproperlyConfigured('Definí DJANGO_ALLOWED_HOSTS con los hosts concretos de la aplicación.')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'Gastos',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'Proyecto.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Proyecto.wsgi.application'

DATABASES = {'default': database_config(os.environ.get('DATABASE_URL', ''))}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'inicio'
LOGOUT_REDIRECT_URL = 'login'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '3600' if not DEBUG else '0'))
# Sólo habilitar detrás de un proxy que sobrescriba X-Forwarded-Proto.
if os.environ.get('DJANGO_BEHIND_PROXY', 'False') == 'True':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.environ.get(
    'DJANGO_CSRF_TRUSTED_ORIGINS', ''
).split(',') if origin.strip()]
CSRF_FAILURE_VIEW = 'Gastos.views.core_views.csrf_failure'
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
