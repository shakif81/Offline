# Línea TRAXX v7.0 — proyecto modular

Abre `index.html` (doble clic, sin servidor). Para usar la cámara del escáner en el móvil, la página tiene que estar alojada en HTTPS.

## Estructura
- `index.html` — HTML de la app + enlaces a CSS y JS.
- `css/` — 7 hojas, en orden numérico.
- `js/` — 43 scripts, en orden numérico.

## Reglas
1. **No cambies el orden de los `<script>`** en `index.html`: todos comparten el mismo ámbito global. `90-exports.js` y `99-init.js` deben ir siempre los últimos.
2. Módulo nuevo: crea `js/NN-nombre.js` y añade su `<script>` antes de `90-exports.js`.
3. Los enlaces llevan `?v=2`. Cuando cambies un archivo y lo subas, sube ese número (`?v=3`…) en `index.html` para que el móvil no use la versión guardada en caché.
4. Si añades una función que se usa desde un `onclick` escrito a mano en el HTML, añade su línea `window.nombre = nombre;` en `90-exports.js`.

## Mapa de módulos JS
**Núcleo:** 01 config/estado · 02 firebase · 03 utilidades · 04 IdGen · 05 auth · 06 navegación · 07 listeners · 08 modales (PDF/foto/vídeo)

**Operario:** 09 operaciones · 10 montajes · 11 estaciones · 12 cronómetro · 13 badge cronómetro · 14 terminar montaje · 15 dashboard · 16 kanban · 17 materiales · 18 verificar materiales (con confirmación) · 19 herramientas · 20 resistencias · 21 escáner · 22 chat · 23 chat panel flotante · 24 notificaciones · 25 inspección

**Admin:** 30 operarios · 31 estaciones · 32 operaciones · 33 materiales · 34 montajes · 35 recursos del montaje · 36 tornillería · 37 herramientas · 38 piezas kanban · 39 movimientos kanban · 40 alertas kanban · 41 entregas · 42 alertas admin · 43 registros · 44 TQC · 45 config escáner

**Final:** 90 exports al window · 99 init
