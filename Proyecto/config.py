"""Lectura de configuración sin valores secretos por defecto en producción."""
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


def load_env(path: Path, environ: dict) -> None:
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        environ.setdefault(key.strip(), value)


def database_config(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in {'postgres', 'postgresql'} or not parsed.path.strip('/'):
        raise ImproperlyConfigured('DATABASE_URL debe apuntar a una base PostgreSQL.')
    query = parse_qs(parsed.query, strict_parsing=True)
    allowed = {'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'connect_timeout'}
    if query.keys() - allowed or any(len(values) != 1 for values in query.values()):
        raise ImproperlyConfigured('DATABASE_URL contiene opciones no admitidas.')
    options = {key: values[0] for key, values in query.items()}
    options.setdefault('connect_timeout', '10')
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(parsed.path.lstrip('/')),
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': unquote(parsed.hostname or 'localhost'),
        'PORT': parsed.port or 5432,
        'OPTIONS': options,
        'CONN_MAX_AGE': 60,
        'CONN_HEALTH_CHECKS': True,
    }
