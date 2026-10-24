"""Pruebas portátiles: nunca conectan a la base personal ni leen su .env."""
import os

os.environ['DJANGO_ENV_FILE'] = '/dev/null'
os.environ['DJANGO_SECRET_KEY'] = 'test-only-' + 'x' * 64
os.environ['DJANGO_DEBUG'] = 'True'
os.environ['DJANGO_ALLOWED_HOSTS'] = 'testserver,localhost,127.0.0.1'
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test_only'

from .settings import *  # noqa: E402,F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
