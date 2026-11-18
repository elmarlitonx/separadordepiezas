# Separador de Piezas de Contenido

Herramienta en Node.js que toma una pieza madre desde una URL (o un HTML de respaldo), la diagnostica, genera piezas derivadas con parámetros UTM, valida reglas de negocio, programa un calendario semanal según el historial de publicaciones, abre una vista web local sin necesidad de servidor y expone una API REST con Express.

## Requisitos previos

- Tener instalado **Node.js** (versión 18 o superior).
- Tener instalado **Git**.

## Instalación desde GitHub

1. Clona el repositorio y entra a la carpeta del proyecto:
   ```
   git clone <URL-DEL-REPOSITORIO>
   cd separadordepiezas
   ```

2. Instala las dependencias (`cheerio`, `csv-parse` y `express`):
   ```
   npm install
   ```

## Configuración de archivos en `inputs/`

Antes de ejecutar el programa, asegúrate de que la carpeta `inputs/` tenga los archivos necesarios:

- `config.json` (reglas, formatos, UTM, términos prohibidos y horarios).
- `ventana.json` (fechas de inicio y fin para programar).
- `calendario_ocupado.csv` (espacios ya reservados).
- `historial_publicaciones.csv` (historial para puntuar y elegir mejores horarios).
- **Archivo `.html` de respaldo (importante):**
  - Asegúrate de dejar un archivo `.html` dentro de `inputs/` como respaldo por si la URL falla o devuelve contenido vacío.
  - **Solo puede haber 1 archivo `.html`** dentro de `inputs/` (el sistema tomará el primero que encuentre).

## Cómo ejecutar el programa (terminal)

Tienes **2 formas** de correrlo con un solo comando desde la raíz del proyecto:

**Opción 1 (con Node directamente):**
```
node src/index.js https://ejemplo.com/mi-articulo
```

**Opción 2 (con npm):**
```
npm start -- https://ejemplo.com/mi-articulo
```

Al finalizar, el programa guarda los resultados en `outputs/` (`diagnostico.json`, `piezas_derivadas.json`, `calendario.json`, `anomalias_y_avisos.json` y `datos.js`) y abre automáticamente **`public/index.html`** en tu navegador con:
- Vista semanal con colores por formato, puntajes y aprobación humana (LC / DM).
- Filtros por **formato** y **estado**.
- Detalle completo de cada pieza al hacer clic en su tarjeta (con botón para copiar texto y enlace directo con UTM).

## Cómo usar la API REST (Express)

Para encender el servidor de la API en el puerto `3001`:

- **Modo desarrollo (reinicio automático al guardar):**
  ```
  npm run dev
  ```
- **Modo normal:**
  ```
  npm run api
  ```

### Endpoints disponibles (`http://localhost:3001`)

- **`GET /`** — Información general y lista de rutas.
- **`GET /api/estado`** — Verifica que la API está activa.
- **`GET /api/resultados`** — Devuelve los últimos archivos generados en `outputs/`.
- **`POST /api/procesar`** — Ejecuta el flujo completo enviando una URL en JSON:
  ```json
  {
    "url": "https://ejemplo.com/mi-articulo"
  }
  ```