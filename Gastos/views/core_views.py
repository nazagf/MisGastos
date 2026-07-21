import json

from django.shortcuts import render


def inicio(request):
    """Sirve el dashboard (frontend de una sola página)."""
    return render(request, 'Gastos/index.html')


def leer_json(request):
    """Devuelve el cuerpo JSON de la request como dict (o {} si está vacío)."""
    if not request.body:
        return {}
    return json.loads(request.body.decode('utf-8'))
