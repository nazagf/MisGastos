# MisGastos en un VPS Ubuntu

Arquitectura: HTTPS → Nginx → Gunicorn en `127.0.0.1:8010` → Django → PostgreSQL.

La región de Sudáfrica es válida; medir latencia y consumo antes de dimensionar. Para una demo pequeña, empezar con un worker y dos threads y medir. Ubicar PostgreSQL cerca de Django. No ejecutar estas instrucciones sobre un VPS con otros servicios sin revisar primero memoria, disco, puertos 80/443/8010/5432 y configuración existente. Los ejemplos no reemplazan automáticamente otros sitios.

## Preparar el código

Usar Python 3.12 o posterior y PostgreSQL 14 o posterior, con una base y un rol exclusivos para MisGastos. No publicar PostgreSQL ni Gunicorn en Internet. Para un PostgreSQL local, el usuario de la app debe tener acceso a su base y no ser superusuario ni tener CREATEDB.

El ejemplo systemd usa un usuario de sistema `misgastos` y el checkout en `/srv/misgastos`. Crear esa cuenta/directorio si no existen y clonar el repositorio con ese usuario. El código y `staticfiles/` deben permitir lectura/travesía a Nginx, pero `.env` debe ser propiedad de `misgastos` con modo 600. No dar permisos 777.

Dentro del checkout, con el usuario de aplicación:

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

Los assets compilados están incluidos en Git. Si cambian las fuentes, ejecutar `npm ci --ignore-scripts && npm run build` en desarrollo y versionar los resultados.

## Configurar el entorno

Crear `/srv/misgastos/.env` a partir de `.env.production.example` sin sobrescribir un archivo existente. Completar dominio, base, usuario, contraseña y una clave nueva generada con `secrets.token_urlsafe(64)`. No publicar esos valores.

`DJANGO_BEHIND_PROXY=True` sólo es correcto con el proxy incluido, que sobrescribe `X-Forwarded-Proto`. Gunicorn debe permanecer en loopback. Una base remota requiere TLS con validación de certificado y host (`sslmode=verify-full` y el archivo CA del proveedor). Las opciones TLS de DATABASE_URL se conservan.

El archivo `.env` admite líneas `CLAVE=valor` y comillas envolventes, sin expansión de variables ni comentarios al final de la línea. Las variables del servicio tienen prioridad.

## Migrar y crear tu cuenta

Antes de actualizar una base existente: exportar un backup y revisar registros incompatibles con las nuevas validaciones/restricciones. Si hay montos no positivos o presupuestos negativos, corregirlos de forma explícita antes de migrar. No borrar registros para forzar el paso.

Como usuario de aplicación, desde `/srv/misgastos`:

```bash
venv/bin/python manage.py migrate
venv/bin/python manage.py createsuperuser
venv/bin/python manage.py collectstatic --noinput
venv/bin/python manage.py check --deploy
```

Crear la cuenta interactivamente. No usar contraseñas de ejemplo ni cargar datos personales para una demo pública. La app es privada y de un único conjunto de datos: una cuenta común no puede entrar.

El HSTS inicial es de una hora y sólo afecta este host. Django puede advertir que no se habilitaron `includeSubDomains` y `preload`: son decisiones voluntarias, no activarlas para silenciar un aviso sin verificar los demás subdominios y sus requisitos. Aumentar la duración tras verificar HTTPS.

## Gunicorn y Nginx

Revisar `deploy/misgastos.service`, adaptar rutas/usuario si corresponde y copiarlo a `/etc/systemd/system/misgastos.service`. Cuando el archivo esté revisado:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now misgastos
sudo journalctl -u misgastos -n 50 --no-pager
```

No usar `runserver` para publicar. Gunicorn escucha únicamente en `127.0.0.1:8010`.

El ejemplo `deploy/nginx.conf` requiere un certificado existente. Para obtener el primero con Certbot webroot:

1. Crear DNS A del dominio hacia el VPS y revisar/eliminar un AAAA incorrecto, si lo hubiera.
2. Habilitar tráfico 80 y 443 tanto en las reglas de Azure como en el firewall local, preservando el acceso SSH.
3. Crear `/var/www/letsencrypt` y un **vhost temporal sólo HTTP** con `server_name` del dominio y `location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }`. El resto puede devolver 404. No enviar usuarios a Django por HTTP.
4. Revisar con `nginx -t`, recargar y obtener el certificado con `sudo certbot certonly --webroot -w /var/www/letsencrypt -d TU_DOMINIO`.
5. Adaptar todas las apariciones del dominio en `deploy/nginx.conf`, incluidas las rutas del certificado. Habilitar el vhost final después de verificar que no entra en conflicto con los sitios existentes.
6. Ejecutar `sudo nginx -t` antes de recargar y verificar la renovación con `sudo certbot renew --dry-run`.

El proxy limita peticiones al login para reducir intentos automatizados. Si hay otro proxy/CDN delante, revisar la identificación real del cliente y las cabeceras antes de publicar.

## Comprobar el resultado

- HTTP redirige a HTTPS y el certificado es válido.
- Sin sesión, `/` lleva al login y `/api/expenses` devuelve 401.
- Una cuenta común no puede ver los gastos.
- Login y logout funcionan; logout sólo acepta POST con CSRF.
- Crear/editar/borrar un gasto persiste después de recargar.
- Si falla una escritura, no se muestra un éxito y el formulario conserva los campos.
- Importar un archivo inválido conserva los datos anteriores.
- Los estilos, gráficos y el login cargan desde `/static/`; la consola del navegador no muestra errores.
- Sólo 80/443 y el acceso administrativo previsto están publicados; 8010/5432 no son públicos.

Las pruebas automatizadas de DOM no certifican estos puntos en el VPS. Este repositorio todavía requiere esa validación después del despliegue.

## Backups y actualizaciones

Guardar dumps de PostgreSQL fuera del repositorio, con permisos privados y una copia externa. Usar `pg_dump -Fc` con un mecanismo privado de autenticación o contraseña interactiva, sin ponerla en la línea de comandos. Probar la restauración en una base separada. JSON es útil para conjuntos pequeños; los dumps nativos cubren volúmenes mayores y todo el esquema.

Para actualizar: backup → revisar cambios y migraciones → instalar requirements → migrar → collectstatic → reiniciar sólo `misgastos` → comprobar login, API y persistencia. No automatizar un `git pull` sobre cambios locales pendientes.
