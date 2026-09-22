# Manual del proyecto

Para quien va a trabajar en este repositorio sin haber construido antes una
Lambda con SAM. Explica qué es cada pieza, cómo viaja una petición de punta a
punta, cómo agregar un endpoint, cómo se prueba y cómo se despliega.

Índice:

1. [Qué es esto, en cuatro conceptos](#1-qué-es-esto-en-cuatro-conceptos)
2. [Mapa del repositorio](#2-mapa-del-repositorio)
3. [Cómo viaja una petición](#3-cómo-viaja-una-petición)
4. [Anatomía de una Lambda](#4-anatomía-de-una-lambda)
5. [Agregar un endpoint nuevo, paso a paso](#5-agregar-un-endpoint-nuevo-paso-a-paso)
6. [Validación: quién revisa qué](#6-validación-quién-revisa-qué)
7. [Base de datos y stored procedures](#7-base-de-datos-y-stored-procedures)
8. [Trabajar en local](#8-trabajar-en-local)
9. [Cómo se despliega](#9-cómo-se-despliega)
10. [Ambientes: dev, test, prod y efímeros](#10-ambientes-dev-test-prod-y-efímeros)
11. [Configuración en AWS y GitHub](#11-configuración-en-aws-y-github)
12. [Frontend](#12-frontend)
13. [Problemas que ya nos pasaron](#13-problemas-que-ya-nos-pasaron)
14. [Glosario](#14-glosario)

---

## 1. Qué es esto, en cuatro conceptos

**Lambda.** Una función que AWS ejecuta cuando alguien la llama. No hay
servidor que administrar: subes el código, AWS lo corre cuando llega una
petición y cobra sólo por el tiempo que tardó. Cada archivo
`src/functions/*/index.mjs` es una Lambda.

**API Gateway.** La puerta de entrada HTTP. Recibe `GET /ping`, decide qué
Lambda lo atiende, valida el cuerpo si se lo pedimos y devuelve la respuesta.
El archivo `openapi.yaml` le dice qué rutas existen y con qué forma.

**CloudFormation.** El servicio de AWS que crea infraestructura a partir de un
archivo de texto. Le das una plantilla y él crea (o actualiza, o borra) todos
los recursos que describe, en orden. Al conjunto de recursos creados a partir
de una plantilla se le llama **stack**.

**SAM.** *Serverless Application Model*: una capa encima de CloudFormation que
hace corta la plantilla para aplicaciones serverless. Donde CloudFormation
necesitaría cincuenta líneas para una Lambda con su rol, sus permisos y su
ruta en el API, SAM necesita quince (`AWS::Serverless::Function`). También es
la herramienta de línea de comandos (`sam build`, `sam deploy`) que empaqueta
el código y lo sube.

Todo junto: **`template.yaml` describe la aplicación → SAM la traduce → CloudFormation
la crea → API Gateway recibe las peticiones → las Lambdas las atienden.**

---

## 2. Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `template.yaml` | La aplicación completa: API, Lambdas, permisos, variables de entorno, outputs. **Si no está aquí, no existe en AWS.** |
| `openapi.yaml` | El contrato del API: rutas, métodos, schemas de entrada y salida, y qué Lambda atiende cada ruta. API Gateway lo usa tal cual. |
| `src/functions/<nombre>/index.mjs` | Una Lambda. Exporta `handler` y las funciones que usa, para poder probarlas por separado. |
| `src/functions/<nombre>/tests/` | Sus pruebas (vitest). |
| `src/shared/` | Código compartido: respuesta HTTP (`apigateway`), conexión a MySQL (`database`), logging y métricas (`lambda-powertools`). |
| `sql/` | La tabla y los stored procedures del CRUD de ejemplo, y datos de prueba. |
| `portman/` | Configuración de Portman: pruebas de contrato que se corren contra el API recién desplegado. |
| `.github/workflows/` | El pipeline: qué corre en cada push y PR. |
| `samconfig.ci.yaml` | Parámetros del `sam deploy` que corre el pipeline (nombre del stack, credenciales de la base). |
| `pipeline-bootstrap.yaml` | Plantilla que crea, una sola vez por ambiente, los roles y el bucket que el pipeline necesita. |
| `docker-compose.yaml`, `scripts/` | MySQL local y utilidades para correr el CRUD sin AWS. |
| `frontend/` | Sitio de ejemplo en Next que consume el API (destinado a su propio repositorio). |
| `docs/` | Este manual y guías puntuales. `docs/swagger/` es la página que se publica en GitHub Pages. |
| `eslint.config.mjs`, `vitest.config.mjs`, `.spectral.yaml` | Reglas de estilo del código, de las pruebas y del contrato OpenAPI. |

---

## 3. Cómo viaja una petición

Tomemos `POST /clientes` con `{ "nombre": "Ana", "email": "ana@demo.mx" }`.

```
navegador ──HTTPS──▶ API Gateway ──evento JSON──▶ Lambda ──CALL sp──▶ MySQL
                        │                          │
                        │ 1. ¿existe POST /clientes?  (openapi.yaml)
                        │ 2. ¿el cuerpo cumple el schema?  (request validator)
                        │    no → 400 { message, detalle }  y la Lambda NUNCA corre
                        │
                        └─▶ 3. invoca CreateClienteFunction con un "evento":
                               { body: '{"nombre":...}', pathParameters, queryStringParameters, headers, ... }
                                                           │
                               4. handler(evento):         │
                                  - normaliza y valida reglas de negocio
                                    no → 400 { message, errores: [{ campo, mensaje }] }
                                  - callProcedure('sp_clientes_crear', [...])
                                  - devuelve { statusCode: 201, body: '{"clienteId":4,...}' }
                                                           │
                        ◀── 5. API Gateway convierte ese objeto en la respuesta HTTP
```

Tres cosas que conviene fijar desde el principio:

- **La Lambda no recibe una petición HTTP; recibe un objeto.** `event.body` es
  un *string* JSON (hay que hacer `JSON.parse`), `event.pathParameters` y
  `event.queryStringParameters` son objetos con strings.
- **La Lambda no devuelve una respuesta HTTP; devuelve un objeto** con
  `statusCode`, `headers` y `body` (string). `getResponse()` en
  `src/shared/apigateway` arma ese objeto para no repetirlo.
- **Si el cuerpo no cumple el schema, la Lambda nunca se ejecuta.** El gateway
  lo rechaza antes. Por eso hay dos formas de 400 (sección 6).

---

## 4. Anatomía de una Lambda

Una Lambda son cuatro archivos que se corresponden entre sí. Se explica con
`/ping` porque es la más pequeña que existe: su código y sus pruebas están en
`src/functions/ping/`, aunque hoy no se despliega (el API sólo expone
`/clientes`, ver sección 7). El bloque de `template.yaml` de abajo es el que
habría que agregar para publicarla.

### 4.1 El código — `src/functions/ping/index.mjs`

```js
import { getResponse } from '../../shared/apigateway/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async () => {
  try {
    return getResponse(200, buildPong());
  } catch (err) {
    logger.error('Error en ping', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

export const buildPong = () => ({
  message: 'pong',
  timestamp: new Date().toISOString()
});
```

- `handler` es lo que AWS invoca. Está envuelto en `initializePowertools`, que
  agrega logs estructurados, métricas y trazas (X-Ray) sin que el handler lo
  note.
- La lógica va en funciones aparte (`buildPong`) **dentro del mismo archivo**
  y exportadas, para probarlas sin AWS. Es la regla del proyecto: cada Lambda
  es independiente, no comparte módulos de lógica con otras.
- El `try/catch` garantiza que un error se convierta en un 500 con cuerpo
  JSON en lugar de un error crudo de Lambda.

### 4.2 La infraestructura — `template.yaml`

```yaml
  PingFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/ping        # qué carpeta se empaqueta
      Handler: index.handler             # archivo.export que AWS invoca
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /ping
            Method: GET
      Policies:
        - AWSLambdaBasicExecutionRole    # permiso para escribir logs
    Metadata:
      BuildMethod: esbuild               # empaqueta index.mjs con sus imports
      BuildProperties: { Format: esm, Target: es2020, EntryPoints: [index.mjs], ... }
```

Lo que no se ve porque está en `Globals`: runtime `nodejs24.x`, arquitectura
`arm64`, 128 MB, 10 s de timeout. Una función puede sobrescribirlo (`StatusFunction`
tiene `Timeout: 30` porque abre una conexión a MySQL).

### 4.3 El contrato — `openapi.yaml`

```yaml
  /ping:
    get:
      operationId: ping
      tags: [Tool]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                required: [message, timestamp]
                properties:
                  message:   { type: string, maxLength: 20 }
                  timestamp: { type: string, format: date-time }
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${PingFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy
```

- `x-amazon-apigateway-integration` es el pegamento: dice que esta ruta invoca
  `PingFunction` (el nombre lógico de `template.yaml`). `httpMethod: POST` es
  cómo API Gateway invoca a Lambda por dentro; no tiene que ver con el método
  público.
- El schema de respuesta lo usan Swagger para documentar y Portman para
  verificar que la respuesta real coincide.
- Los schemas van escritos dentro de cada operación, no en `components`, para
  leer cada ruta completa de un vistazo.

### 4.4 Las pruebas — `src/functions/ping/tests/index.spec.mjs`

```js
import { buildPong } from '../index.mjs';

it('responde pong', () => {
  expect(buildPong().message).toBe('pong');
});
```

Las Lambdas que tocan la base simulan `callProcedure` con `vi.mock`, y las que
quieren probar el `handler` completo simulan también `initializePowertools`
para que sea una función normal. `src/functions/clientes/create/tests/` es el
ejemplo más completo: reglas, procedimiento y handler (201, 400, 409, 500).

---

## 5. Agregar un endpoint nuevo, paso a paso

Supón `GET /hora` que devuelve la hora del servidor.

1. **Carpeta y handler.** `src/functions/hora/index.mjs`, copiando la
   estructura de `ping`. Lógica en una función exportada (`buildHora`).
2. **Prueba.** `src/functions/hora/tests/index.spec.mjs` sobre `buildHora`.
   `npm test` debe pasar.
3. **Contrato.** En `openapi.yaml`, dentro de `paths:`, la ruta `/hora` con su
   `operationId`, su schema de respuesta, el `request-validator` y la
   `integration` apuntando a `${HoraFunction.Arn}`. `npm run lint-api` debe
   pasar: exige `operationId` en camelCase, descripción, `maxLength` en
   strings, `minimum`/`maximum` en enteros, `maxItems` en arreglos.
4. **Infraestructura.** En `template.yaml`, dentro de `Resources:`,
   `HoraFunction` copiando `PingFunction` y cambiando `CodeUri`, `Path` y
   `Method`.
5. **Portman.** En `portman/portman-config.json`, agrega `GET::/hora` a
   `orderOfOperations` donde deba correr. Si el endpoint necesita algo que no
   existe en `dev` (una base de datos), agrégalo a `operationIds` de
   `portman/portman-filter.json` para excluirlo del run.
6. **Rama y PR.** `git checkout -b hora`, commit, push, PR hacia `dev`. El
   pipeline levanta un stack sólo para tu PR (sección 10) y corre Portman
   contra él. Cuando el PR se mergea, el stack del PR se borra solo y `dev` se
   actualiza.

Si el endpoint recibe cuerpo o parámetros, lee la sección 6 antes de escribir
validaciones.

---

## 6. Validación: quién revisa qué

Hay dos capas, y cada regla vive en una sola.

| Regla | Dónde | Por qué |
|---|---|---|
| Campos requeridos, tipos, `maxLength`, `pattern`, campos de más | **`openapi.yaml`** (schema) | API Gateway la aplica antes de invocar la Lambda: no cuesta una ejecución |
| Tipo y rango de parámetros de ruta y query | **Lambda** | API Gateway sólo comprueba que existan, no los tipa |
| Formato del correo | **Lambda** | API Gateway ignora `format: email` |
| Reglas de negocio (nombre sin espacios, duplicados, relaciones) | **Lambda** | El schema no puede expresarlas |

Las dos capas responden 400 con formas distintas; el frontend distingue por la
presencia de `errores`:

```json
{ "message": "Solicitud invalida", "detalle": "[object has missing required properties ([\"email\"])]" }
{ "message": "Datos invalidos", "errores": [{ "campo": "email", "mensaje": "El correo no tiene un formato valido" }] }
```

La primera la arma la plantilla `BAD_REQUEST_BODY` de `openapi.yaml` (mensaje
fijo, no se puede personalizar por campo). La segunda la arma la Lambda en una
función pura `validarX()` que devuelve la lista de errores.

`docs/clientes-example.md` sección 5 tiene la tabla completa para el CRUD.

---

## 7. Base de datos y stored procedures

Las Lambdas no escriben SQL: llaman stored procedures. `callProcedure(nombre, params)`
en `src/shared/database` abre la conexión, ejecuta `CALL nombre(?, ?)` y
devuelve las filas del primer result set. Cada procedimiento termina con un
`SELECT` para que la Lambda reciba el registro afectado.

Las credenciales llegan como variables de entorno `DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_PORT`, `DB_DATABASE`, que `template.yaml` inyecta en cada
función que las necesita a partir de sus parámetros. La versión con Secrets
Manager está comentada en `template.yaml` y `src/shared/database/index.mjs`:
se desactivó porque cobra por secreto aunque no se use.

`sql/clientes.sql` tiene la tabla y los cinco procedimientos del CRUD.
`docs/local-db.md` explica cómo levantar un MySQL local con Docker y cómo
darle una base a las Lambdas desplegadas.

**Estado actual:** las rutas `/clientes` no están desplegadas porque el
ambiente `dev` no tiene base de datos. El código y las pruebas sí están;
`docs/clientes-example.md` tiene los bloques para reactivarlas.

---

## 8. Trabajar en local

```powershell
npm install
npm run lint          # estilo del código (ESLint)
npm run lint-api      # reglas del contrato (Spectral)
npm test              # pruebas unitarias (vitest)
npm run coverage      # lo mismo con cobertura → docs/coverage/
```

Para ver el CRUD con base de datos real (requiere Docker Desktop):

```powershell
docker compose up -d  # MySQL con tabla, procedimientos y datos de ejemplo
npm run demo          # invoca los cinco handlers en secuencia y muestra cada respuesta
```

No hace falta SAM CLI ni cuenta de AWS para nada de lo anterior. Sí hace falta
para `sam local start-api` (simular API Gateway en tu máquina), que este
proyecto no usa: el ambiente de prueba real es el stack efímero de cada PR.

---

## 9. Cómo se despliega

Nadie corre `sam deploy` a mano. Lo hace GitHub Actions:

```
push a dev  ó  PR hacia dev
   │
   ├─ Pre-Deployment ........ npm ci, lint, coverage      (pre-deploy-validations.yaml)
   ├─ Resolve Stack Name .... secrets-dev  ó  demo-secrets-<rama>   (resolve-stack-name.yaml)
   ├─ Deploy API ............ sam validate, build, deploy  (shared-deploy-api.yaml)
   │      └─ genera aws-exports.json con los outputs del stack y lo sube como artefacto
   ├─ Post-Deployment ....... Portman contra el API recién desplegado  (post-deploy-validations.yaml)
   └─ Publish API Docs ...... Swagger en GitHub Pages, sólo en push a dev  (publish-docs.yaml)
```

Cómo consigue el pipeline permiso en AWS: **OIDC**. GitHub emite un token que
dice "soy el repo joadva/demo, en el environment dev"; AWS lo acepta porque el
rol `gha-demo-dev-pipeline` confía en ese emisor (`pipeline-bootstrap.yaml`).
No hay claves de acceso guardadas en ningún lado.

Qué hace `Deploy API` por dentro:

1. `sam validate --lint` — la plantilla es válida.
2. `sam build` — esbuild empaqueta cada `index.mjs` con sus dependencias en
   `.aws-sam/build/`. Se cachea por hash de `src/**`, `template.yaml`, etc.
3. `sam deploy` — sube los paquetes al bucket de artefactos y le pide a
   CloudFormation crear o actualizar el stack. Si no hay cambios, no falla
   (`--no-fail-on-empty-changeset`).
4. Lee los `Outputs` del stack (`ApiURL`, `Region`, `StackName`) y los
   convierte en `aws-exports.json`, que el job de Portman y el frontend usan.

Cada workflow tiene su explicación detallada en `docs/workflows/`.

---

## 10. Ambientes: dev, test, prod y efímeros

| Ambiente | Stack | Cómo se despliega | Para qué |
|---|---|---|---|
| dev | `secrets-dev` | push a la rama `dev` | Integración continua; la URL que usa el frontend |
| test | `secrets-test` | manual (`Deploy Test` → Run workflow) | Validación previa a prod |
| prod | `secrets-prod` | manual (`Deploy Prod` → Run workflow) | Producción |
| efímero | `demo-secrets-<rama>` | abrir o actualizar un PR hacia `dev` | Probar el cambio aislado, con Portman, sin tocar `dev` |

El nombre del stack efímero sale de la rama: minúsculas, todo lo que no sea
letra o número se vuelve `-`, cortado a 9 caracteres. `filtro-portman` →
`demo-secrets-filtro-po`.

Al cerrar el PR (mergeado o no) o borrar la rama, `cleanup-dev.yaml` ejecuta
`sam delete` sobre ese stack. Tiene una guarda que se niega a borrar
`secrets-dev`, `secrets-test` y `secrets-prod`.

Cada ambiente es un **Environment** de GitHub con sus propias variables y
secrets (sección 11), y un despliegue a `prod` puede exigir aprobación manual
desde la configuración del Environment.

---

## 11. Configuración en AWS y GitHub

Se hace una vez por ambiente.

**AWS — `pipeline-bootstrap.yaml`.** Se despliega a mano en CloudFormation
con los parámetros `Stage` (dev/test/prod), `GitHubOrg`, `RepositoryName` y
`CreateOIDCProvider` (Yes sólo la primera vez en la cuenta). Crea:

- el proveedor OIDC de GitHub (si se pidió),
- el bucket `sam-artifacts-<repo>-<stage>-<cuenta>` para los paquetes,
- `gha-<repo>-<stage>-pipeline`: el rol que asume GitHub Actions,
- `gha-<repo>-<stage>-cfn-exec`: el rol con el que CloudFormation crea los recursos.

**GitHub — Settings → Environments → `<stage>`.**

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `PIPELINE_EXECUTION_ROLE` | ARN del rol `gha-…-pipeline` (output del bootstrap) |
| Variable | `CLOUDFORMATION_EXECUTION_ROLE` | ARN del rol `gha-…-cfn-exec` |
| Variable | `ARTIFACTS_BUCKET_NAME` | nombre del bucket |
| Secret | `READ_SECRET_DB` | ARN del secreto con el usuario de MySQL de solo lectura |
| Secret | `WRITE_SECRET_DB` | ARN del secreto con el usuario que puede escribir |

Los valores van en el Environment, **no** a nivel de repositorio: si se
duplican a nivel repo, un ambiente sin configurar hereda los de otro sin
avisar.

**GitHub Pages.** Settings → Pages → Source: *GitHub Actions*. Ahí se publica
el Swagger con las URLs reales de los stacks vivos.

---

## 12. Frontend

`frontend/` es un sitio estático en Next que muestra cómo consumir el API. La
vinculación con el backend es **una variable**: `NEXT_PUBLIC_API_URL`, la
URL de `secrets-dev`, que no cambia entre despliegues. `frontend/README.md`
explica cómo correrlo, cómo publicarlo en GitHub Pages y cómo `lib/api.js`
interpreta las dos formas del 400. Está pensado para moverse a su propio
repositorio; la carpeta ya lleva su workflow.

---

## 13. Problemas que ya nos pasaron

| Síntoma | Causa | Solución |
|---|---|---|
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | GitHub ahora emite el `sub` como `repo:org@ID/repo@ID:environment:dev`, y el rol sólo confiaba en `repo:org/repo:*` | `pipeline-bootstrap.yaml` incluye ambos patrones en la política de confianza |
| `Could not load credentials` en un deploy | El Environment de ese stage no tiene las variables | Configurar el Environment (sección 11) |
| `sam validate` avisa W2531, runtime deprecado | Node 20 salió de soporte en Lambda | `Runtime: nodejs24.x` en `Globals` |
| Portman falla con `ENOTFOUND` contra un host raro | `BASE_URL` llegó vacía y Portman cayó al `servers` del contrato, que es un marcador | Se lee la URL del artefacto `aws-exports.json`; si no está, el job falla con mensaje claro |
| Una salida de un job llega vacía a otro job | El valor contenía un secret como subcadena y GitHub lo enmascaró | No pasar URLs por outputs entre jobs; usar artefactos. Y no usar secrets con valores cortos y genéricos (`api`, `demo`) |
| Portman corre endpoints que quería excluir | `operationIds` en `portman-filter.json` es una lista de **exclusión**, no de inclusión | Listar ahí lo que NO debe correr |
| `continue-on-error` marcado como inválido | No se permite en un job que usa `uses:` (workflow reutilizable) | Ponerlo dentro del workflow llamado |
| La cobertura salía en 0 % | `c8 npm test` medía el proceso de npm, no los workers de vitest | `vitest run --coverage` |
| `next build` muere con *heap out of memory* | Poca RAM libre para los workers de Next | `NODE_OPTIONS=--max-old-space-size=4096` |

---

## 14. Glosario

- **ARN** — identificador único de un recurso en AWS (`arn:aws:lambda:us-east-1:123:function:x`).
- **Artefacto (GitHub Actions)** — archivo que un job sube y otro descarga. Aquí: `aws-exports-<stack>` y la colección de Portman.
- **esbuild** — empaquetador que junta `index.mjs` y sus imports en un solo archivo para Lambda.
- **Evento** — el objeto JSON que Lambda recibe; con API Gateway trae `body`, `pathParameters`, `queryStringParameters`, `headers`.
- **Handler** — la función exportada que Lambda invoca: `index.handler`.
- **middy** — librería de middlewares para handlers de Lambda; Powertools se engancha con ella.
- **OIDC** — mecanismo por el que GitHub se identifica ante AWS sin claves guardadas.
- **OpenAPI** — formato estándar para describir un API REST. `openapi.yaml`.
- **Output (CloudFormation)** — valor que un stack expone al terminar, como `ApiURL`.
- **Portman** — convierte `openapi.yaml` en una colección Postman con pruebas de contrato y la ejecuta contra el API real.
- **Powertools** — librería de AWS para logs estructurados, métricas y trazas en Lambda.
- **Request validator** — función de API Gateway que valida cuerpo y parámetros contra el schema antes de invocar la Lambda.
- **Spectral** — linter de OpenAPI; sus reglas están en `.spectral.yaml`.
- **Stack** — conjunto de recursos creados a partir de una plantilla de CloudFormation.
- **Stored procedure (SP)** — procedimiento guardado en MySQL; las Lambdas los llaman en lugar de escribir SQL.
- **Workflow reutilizable** — workflow de GitHub Actions que otros llaman con `uses:`; los de `.github/workflows/shared-*` y `*-validations` lo son.
