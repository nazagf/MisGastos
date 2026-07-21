# MisGastos

Dashboard de finanzas personales con **front y back en Django**. Registra gastos,
maneja presupuestos por mes y muestra tendencias, con persistencia en PostgreSQL
vía el ORM de Django. El frontend (diseño "estado de cuenta") se sirve como
template + estáticos, y la API vive en `/api/*`.

## Stack
- Django 6 (templates + vistas API con JSON) + ORM/migraciones/admin
- PostgreSQL (contenedor Docker `postgres_db`, DB `misgastos_django`)
- Frontend: HTML + Tailwind (CDN) + Chart.js + módulos JS vanilla

## Puesta en marcha

Requisito: el contenedor `postgres_db` corriendo (`docker start postgres_db`).

```bash
cd MisGastos
source venv/bin/activate          # el venv ya está creado con las deps
python manage.py migrate          # crea las tablas (idempotente)
python manage.py runserver        # http://127.0.0.1:8000
```

La primera carga en el navegador genera datos de muestra automáticamente y los
persiste en Postgres.

### Panel de administración (opcional)
```bash
python manage.py createsuperuser  # elegí usuario y contraseña
```
Luego entrás a `http://127.0.0.1:8000/admin/` para ver/editar gastos,
presupuestos y settings.

## Configuración
Las credenciales viven en `.env` (no se versiona). Ver variables:
- `DATABASE_URL` — cadena de conexión a Postgres (DB `misgastos_django`)
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`

## API
Mismo contrato que el frontend espera (`static/js/storage.js`):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET / POST | `/api/expenses` | listar / crear gasto |
| PUT / DELETE | `/api/expenses/<id>` | editar / borrar gasto |
| GET / POST | `/api/budgets` | presupuestos (GET: objeto por `year_month`) |
| GET / POST | `/api/settings` | configuración de usuario |

## Estructura
Arquitectura en capas (modelos → repositorios → servicios → vistas), un archivo
por entidad:
```
Proyecto/            configuración Django (settings, urls, wsgi, asgi)
Gastos/              app del dominio
  models/            un modelo por archivo (Gasto, Presupuesto, Configuracion)
  repositories/      acceso a datos (consultas al ORM)
  services/          lógica de negocio + serialización al contrato del front
  views/             vistas por entidad (gasto/presupuesto/configuracion) + core
  tests/             pruebas
  urls.py  admin.py  apps.py
  templates/Gastos/  index.html (frontend, con {% static %})
  static/Gastos/     js/, css/, favicon.svg
```

## Notas
- Las vistas API usan `@csrf_exempt` porque el frontend hace `fetch` sin token
  CSRF (app local mono-usuario). Si se agrega login, mover a sesiones + CSRF.
- Los servicios traducen entre los modelos (campos en español: `Descripcion`,
  `Monto`, etc.) y el JSON que espera el frontend (`description`, `amount`,
  `paymentMethod`…), así el front no se toca.
