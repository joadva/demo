# Frontend de ejemplo (Next)

Muestra cómo un frontend se conecta al API desplegado con SAM desde
[`joadva/demo`](https://github.com/joadva/demo). Dos páginas:

- `/` — explica los tres pasos de la conexión y prueba en vivo `/ping`,
  `/info` y `/echo` (incluido un 400 del gateway).
- `/clientes-sam/` — CRUD completo con errores por campo. Necesita las rutas
  `/clientes-sam` desplegadas y con base de datos (`docs/clientes-example.md` del
  backend).

Es un sitio estático (`output: 'export'`): no hay servidor de Next, el
navegador llama al API directo.

## Cómo se vincula con el backend

Con **una sola variable**: `NEXT_PUBLIC_API_URL`. Es el output `ApiURL` del
stack y no cambia entre despliegues del backend, así que se pone una vez por
ambiente. Se obtiene de cualquiera de estas formas:

- Del resumen del job *Deploy API* en las Actions del backend.
- Del artefacto `aws-exports-<stack>` de ese mismo run (`npm run env:aws` lo
  convierte en `.env.local`).
- Directo de AWS:
  ```powershell
  aws cloudformation describe-stacks --stack-name secrets-dev --query "Stacks[0].Outputs[?OutputKey=='ApiURL'].OutputValue" --output text
  ```

Todo el código que habla con el API está en `lib/api.js`: arma la URL, manda
JSON y convierte cualquier respuesta no-2xx en un `ApiError` que unifica las
dos formas del 400 del backend:

```js
import { listClientesSam, createClienteSam, ApiError } from '@/lib/api';

const { clientes } = await listClientesSam();

try {
  await createClienteSam({ nombre: 'Ana', email: 'ana@demo.mx' });
} catch (err) {
  if (err instanceof ApiError) {
    err.status;     // 400, 404, 409, 500
    err.message;    // "Datos invalidos"
    err.detalle;    // texto de API Gateway cuando el cuerpo no cumple el schema
    err.porCampo;   // { email: 'El correo no tiene un formato valido' } (reglas de la Lambda)
  }
}
```

Cada función pública lleva el nombre del `operationId` de `openapi.yaml`.

## Correrlo local

```powershell
npm install
Copy-Item .env.local.example .env.local   # y pon la URL real
npm run dev                               # http://localhost:3000
```

O, si tienes el `aws-exports.json` del backend a la mano:

```powershell
npm run env:aws -- ruta/al/aws-exports.json
```

## Publicarlo (GitHub Pages, automático)

`.github/workflows/deploy.yaml` compila y publica en cada push a `main`. Sólo
hay que configurar dos cosas en el repo, una vez:

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables → New repository
   variable:** `NEXT_PUBLIC_API_URL` = la URL de `secrets-dev`.

El sitio queda en `https://<usuario>.github.io/<repo>/`. Como es un sitio de
proyecto, el workflow pasa `NEXT_PUBLIC_BASE_PATH=/<repo>` para que las rutas
y los assets cuelguen de ahí; con dominio propio se quita esa línea.

Para publicar en otro lado (S3, Amplify Hosting, Vercel) el resultado es el
mismo directorio `out/`; sólo cambia el paso final del workflow.

## Si `npm run build` muere con "heap out of memory"

Los workers de Next se quedan sin memoria en máquinas con poca RAM libre:

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"; npm run build
```
