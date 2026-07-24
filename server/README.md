# Racha — Web Push server

Este servidor pequeño implementa Web Push (VAPID) para la app "Racha".

Pasos rápidos para probar / desplegar

1) En la carpeta server:
   npm install

2) Generar claves VAPID (localmente):
   npm run gen-keys
   Copiar los valores y exportarlos como variables de entorno VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.

3) Iniciar el servidor:
   PORT=3000 VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... REMIND_HOUR=20 node index.js

4) Poner la URL del servidor (ej: https://mi-server.example.com) en el cliente (index.html) en el campo "Server URL" para activar notificaciones.

Despliegue

- Puedes desplegar en Render / Railway / Fly / Heroku. Asegurate de configurar las variables de entorno en el servicio.
- Para que las notificaciones funcionen en producción el servidor debe ser HTTPS.

Notas de seguridad

- Este servidor guarda las suscripciones en server/subscriptions.json (archivo local). Para producción se recomienda usar una base de datos.
- web-push requiere las claves VAPID: no las compartas públicamente.
