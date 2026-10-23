# Modo sin conexión + app instalable (TRAXX)

## Archivos (descomprime encima de la carpeta del proyecto)
- `manifest.json`, `sw.js`, `icons/` → junto a `index.html` (raíz del proyecto).
- `js/02-firebase.js`, `js/22-chat.js`, `js/23-chat-panel.js` → sustituyen a los actuales.
- `js/46-pwa.js` → módulo nuevo.

## Cambios en index.html
1. En el `<head>`, debajo de `<meta name="apple-mobile-web-app-capable" ...>`:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#1a365d">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="TRAXX">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
```

2. Antes de `<script src="js/90-exports.js...">` (después del 45):

```html
<script src="js/46-pwa.js?v=1"></script>
```

3. Sube el `?v=` de `02-firebase.js`, `22-chat.js` y `23-chat-panel.js`.

## Requisitos
- La app tiene que estar alojada en **HTTPS** (Firebase Hosting, GitHub Pages…). Con el archivo suelto del móvil no hay service worker ni instalación.
- `sw.js` y `manifest.json` deben estar en la misma carpeta que `index.html`.
- Hay que abrir la app **una vez con conexión** para que se guarde en el móvil.

## Qué hace
- Datos sin conexión: Firestore guarda una copia en el móvil. Sin señal se pueden consultar los datos ya cargados y guardar cambios; se envían solos al volver la conexión.
- Indicador abajo: "Sin conexión · N cambios por enviar", "Sincronizando…" y "Todo sincronizado".
- La app (HTML, CSS, JS y librerías) se guarda en el móvil y abre sin conexión. Con conexión siempre descarga la versión nueva, así que no hace falta tocar `sw.js` al cambiar archivos.
- Instalación: tarjeta "Instalar" en Android/Chrome y pista de «Añadir a pantalla de inicio» en iPhone.
- Avisos: con permiso concedido, notificaciones del móvil cuando la app está en segundo plano para rechazo/aprobación de QC, corrección de montaje, mensajes de chat, stock Kanban y faltas de material.

## Si añades un módulo JS nuevo
No hay que tocar `sw.js`: lee `index.html` al instalarse y guarda todo lo que enlaza.

## Límites
- Los avisos funcionan mientras la app siga abierta o en segundo plano. Con la app cerrada del todo haría falta Firebase Cloud Messaging y una Cloud Function.
- Sin conexión no funcionan: subida de fotos (Cloudinary), librería del escáner si no se había cargado antes y el chat en tiempo real.
- Stock: si dos móviles descuentan la misma pieza sin conexión, al sincronizar gana el último valor guardado.
- iPhone: los avisos solo funcionan con la app instalada y iOS 16.4 o superior.
