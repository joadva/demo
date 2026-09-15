# Frontend de ejemplo (Next)

Muestra cómo un frontend se conecta al API que despliega `template.yaml`. Dos
páginas:

- `/` — explica los tres pasos de la conexión y prueba en vivo `/ping`,
  `/info` y `/echo` (incluido un 400 del gateway).
- `/clientes/` — CRUD completo con errores por campo. Necesita las rutas
  `/clientes` desplegadas y con base de datos (`docs/clientes-example.md`).

Es un sitio estático (`output: 'export'`): no hay servidor de Next, el
navegador llama al API directo. Se puede publicar en S3, GitHub Pages o Amplify.

## Correrlo local

```powershell
cd frontend
npm install
npm run env:aws      # lee ../aws-exports.json y escribe .env.local
npm run dev          # http://localhost:3000
```

`aws-exports.json` lo genera cada despliegue como artefacto
`aws-exports-<stack>`; descárgalo del run de *Deploy Dev* (`gh run download
--name aws-exports-secrets-dev` o desde la web) y déjalo en la raíz del repo.
También puedes escribir `.env.local` a mano (ver `.env.local.example`).

## La conexión en tres líneas

```js
import { listClientes, createCliente, ApiError } from '@/lib/api';

const { clientes } = await listClientes();

try {
  await createCliente({ nombre: 'Ana', email: 'ana@demo.mx' });
} catch (err) {
  if (err instanceof ApiError) {
    err.status;     // 400, 404, 409, 500
    err.message;    // "Datos invalidos"
    err.detalle;    // texto del gateway cuando el cuerpo no cumple el schema
    err.porCampo;   // { email: 'El correo no tiene un formato valido' }
  }
}
```

`lib/api.js` es el único lugar que conoce la URL, las cabeceras y las dos
formas del 400. Cada función pública lleva el nombre del `operationId` de
`openapi.yaml`.

## En GitHub Actions

Para construir el frontend apuntando al API recién desplegado, el job
descarga el artefacto del mismo run (o de otro workflow con `run-id`) y lo
convierte en `.env.local` antes de compilar:

```yaml
jobs:
  build-frontend:
    needs: [deploy-api]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      # Mismo run: el artefacto lo subio shared-deploy-api.yaml.
      - uses: actions/download-artifact@v4
        with:
          name: aws-exports-secrets-dev

      - working-directory: frontend
        run: |
          npm ci
          npm run env:aws
          npm run build            # deja el sitio estatico en frontend/out
```

Si el frontend vive en otro repositorio, cambia el `download-artifact` por:

```yaml
      - uses: actions/download-artifact@v4
        with:
          name: aws-exports-secrets-dev
          repository: joadva/demo
          run-id: ${{ github.event.inputs.run_id }}   # o el ultimo run exitoso via gh
          github-token: ${{ secrets.GH_TOKEN_DEMO }}  # PAT con actions:read sobre joadva/demo
```

Para los stacks efímeros de cada PR el nombre del artefacto es
`aws-exports-<stack>` (por ejemplo `aws-exports-demo-secrets-filtro-po`); el
nombre lo calcula `resolve-stack-name.yaml`.

## Dónde publicarlo

`npm run build` deja HTML/JS en `frontend/out/`. Ese directorio se sube tal
cual a un bucket S3 con hosting estático, a GitHub Pages
(`actions/upload-pages-artifact` con `path: frontend/out`) o a Amplify Hosting.

## Si `npm run build` muere con "heap out of memory"

Los workers de Next se quedan sin memoria en máquinas con poca RAM libre.
Dale más heap a Node:

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"; npm run build
```
