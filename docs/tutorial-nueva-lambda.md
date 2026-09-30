# Tutorial: agregar tu primera Lambda, paso a paso

Para quien nunca ha tocado AWS, SAM ni este pipeline. Vamos a crear un
endpoint nuevo de principio a fin, y al terminar vas a poder abrirlo en el
navegador.

**Lo que vamos a construir:** `GET /hora`, que responde la hora del servidor.

```json
{ "hora": "2026-09-29T18:24:05.123Z", "zona": "UTC" }
```

Es a propósito lo más simple posible: no toca base de datos. Cuando entiendas
este camino, agregar uno que sí la use es cambiar dos bloques (lo explico al
final).

## Antes de empezar

Necesitas tres cosas instaladas:

- **Node 22 o más nuevo** — compruébalo con `node --version`
- **Git** — `git --version`
- Un editor, por ejemplo VS Code

Y una vez, dentro de la carpeta del proyecto:

```powershell
npm install
```

No necesitas tener una cuenta de AWS ni instalar nada de AWS. **Todo el
despliegue lo hace GitHub por ti.**

---

## La idea general (léela aunque no la entiendas del todo)

Una Lambda necesita **tres archivos** que se apuntan entre sí. Si te falta uno,
no funciona:

```
1. src/functions/hora/index.mjs   ← el código: qué responde
2. openapi.yaml                   ← el contrato: qué ruta existe y qué devuelve
3. template.yaml                  ← la infraestructura: qué se crea en AWS
```

Piénsalo como un restaurante:

| El archivo | Es… |
|---|---|
| `index.mjs` | **La receta.** Lo que el cocinero prepara |
| `openapi.yaml` | **La carta.** Qué platillos existen y qué trae cada uno |
| `template.yaml` | **El plano del local.** Cuántos cocineros hay y qué puede usar cada uno |

Ahora sí, manos a la obra.

---

## Paso 1. Crea tu rama

**Nunca trabajes directo sobre `dev`.** Cada cambio va en su propia rama.

```powershell
git checkout dev
git pull
git checkout -b hora
```

Qué hizo cada línea:

1. `checkout dev` — te paras en la rama principal de desarrollo
2. `pull` — bajas lo último que hayan subido tus compañeros
3. `checkout -b hora` — creas **tu** rama, llamada `hora`, y te cambias a ella

Comprueba dónde estás:

```powershell
git branch
```

Debe aparecer `* hora` con el asterisco.

---

## Paso 2. Crea el código de la Lambda

Crea la carpeta `src/functions/hora/` y dentro el archivo `index.mjs`:

```js
import { getResponse } from '../../shared/apigateway/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async () => {
  try {
    return getResponse(200, buildHora());
  } catch (err) {
    logger.error('Error en hora', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Devuelve la hora actual del servidor.
 * @return {Object} La hora en formato ISO y su zona.
 */
export const buildHora = () => ({
  hora: new Date().toISOString(),
  zona: 'UTC'
});
```

### Qué significa cada parte

**`handler`** es lo que AWS ejecuta cuando alguien llama al endpoint. El nombre
importa: más adelante, en `template.yaml`, le diremos a AWS "ejecuta
`index.handler`".

**`initializePowertools`** envuelve tu función para que los logs salgan
ordenados en CloudWatch. **No lo quites y no lo modifiques.** Cópialo tal cual
en cada Lambda nueva.

**`getResponse(200, ...)`** arma la respuesta en el formato que espera API
Gateway. Una Lambda no devuelve HTML ni texto: devuelve un objeto con
`statusCode` y `body`. `getResponse` se encarga de eso por ti.

**`buildHora` va aparte y se exporta.** Esto es importante y es la regla del
proyecto: la lógica va en una función separada, **dentro del mismo archivo**,
para poder probarla sin AWS. El `handler` sólo la llama y maneja errores.

**El `try/catch`** hace que, si algo truena, el usuario reciba un 500 con JSON
en lugar de un error feo de AWS.

---

## Paso 3. Escribe la prueba

Crea `src/functions/hora/tests/index.spec.mjs`:

```js
import { describe, expect, it } from 'vitest';
import { buildHora } from '../index.mjs';

describe('buildHora', () => {
  it('devuelve una hora valida', () => {
    expect(Number.isNaN(Date.parse(buildHora().hora))).toBe(false);
  });

  it('dice que la zona es UTC', () => {
    expect(buildHora().zona).toBe('UTC');
  });
});
```

Córrela:

```powershell
npm test
```

Debe decir algo como `Tests 107 passed`. Si dice `failed`, lee el mensaje: casi
siempre es un typo en el nombre de la función o en la ruta del `import`.

> **¿Por qué probar algo tan simple?** Porque el pipeline corre estas pruebas
> antes de desplegar. Si fallan, **nada se sube**. Es tu red de seguridad.

---

## Paso 4. Declara la ruta en `openapi.yaml`

Abre `openapi.yaml`, busca la sección `paths:` y agrega tu ruta **al final de
esa sección**, antes de donde dice `components:`:

```yaml
  /hora:
    get:
      summary: Current server time
      operationId: hora
      description: |
        Devuelve la hora del servidor. No depende de la base de datos.
      tags:
        - ClientesSam
      responses:
        '200':
          description: 'Success'
          content:
            application/json:
              schema:
                type: object
                required:
                  - hora
                  - zona
                properties:
                  hora:
                    type: string
                    format: date-time
                  zona:
                    type: string
                    maxLength: 10
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${HoraFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy
```

### Cuidado con la sangría

YAML se guía por **espacios**, no por llaves. `/hora:` va con **2 espacios** al
inicio, igual que `/clientes-sam:`. Si te equivocas en la sangría, todo truena.
Copia el bloque tal cual y no cambies los espacios.

### Las tres líneas que más confunden

**`operationId: hora`** — el nombre único de esta operación. Debe ir en
camelCase (`obtenerHora`, no `obtener_hora` ni `ObtenerHora`).

**`${HoraFunction.Arn}`** — aquí le dices "esta ruta la atiende la Lambda que
en `template.yaml` se llama `HoraFunction`". **Ese nombre tiene que coincidir
exactamente** con el del paso 5. Es el error número uno de los principiantes.

**`httpMethod: POST`** — no es un error, aunque tu ruta sea `GET`. Ese es el
método interno con el que API Gateway invoca a Lambda, y **siempre es POST**.
El método público es el de arriba, el `get:`.

Ahora revisa que el contrato esté bien escrito:

```powershell
npm run lint-api
```

Debe decir `No results with a severity of 'error' found!`.

> **Si falla**, léelo con calma: el mensaje dice la línea y qué falta. Lo más
> común es que falte `description`, o un `maxLength` en un texto, o un
> `minimum`/`maximum` en un número. Son las reglas del proyecto y están en
> `.spectral.yaml`.

---

## Paso 5. Crea el recurso en `template.yaml`

Abre `template.yaml`, busca `Resources:` y agrega este bloque **al final de las
funciones**, justo antes de donde dice `Outputs:`:

```yaml
  HoraFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/hora
      Handler: index.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /hora
            Method: GET
      Policies:
        - AWSLambdaBasicExecutionRole
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Format: esm
        Minify: false
        OutExtension:
          - .js=.mjs
        Target: es2020
        Sourcemap: true
        EntryPoints:
          - index.mjs
        Banner:
          - js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);
```

### Qué es cada línea

| Línea | Qué dice |
|---|---|
| `HoraFunction:` | El nombre. **Debe ser idéntico al que pusiste en `openapi.yaml`** |
| `CodeUri:` | Qué carpeta se empaqueta y se sube |
| `Handler: index.handler` | Qué archivo y qué export ejecutar: `index.mjs` → `handler` |
| `Path` y `Method` | La ruta pública. **Deben coincidir con `openapi.yaml`** |
| `Policies:` | Los permisos. `AWSLambdaBasicExecutionRole` es el mínimo: escribir logs |
| `Metadata:` | Cómo se empaqueta el código. **Cópialo tal cual, no lo cambies** |

Lo que no ves aquí, porque se hereda de la sección `Globals` de arriba: Node 24,
128 MB de memoria, 10 segundos de límite, arquitectura arm64. Si tu Lambda
necesita más tiempo, agrégale `Timeout: 30` como tienen las del CRUD.

### Los tres nombres que deben coincidir

Este es el punto donde más gente se atora. Revísalo antes de seguir:

```
openapi.yaml:   ${HoraFunction.Arn}          ─┐
template.yaml:  HoraFunction:                 ├─ IGUALES
                                              ┘

openapi.yaml:   /hora:        + get:         ─┐
template.yaml:  Path: /hora   + Method: GET   ├─ IGUALES
                                              ┘

template.yaml:  CodeUri: src/functions/hora  ─┐
en tu disco:    src/functions/hora/index.mjs  ├─ IGUALES
                                              ┘
```

---

## Paso 6. Agrégala a las pruebas de Portman

Portman prueba automáticamente cada endpoint después de desplegarlo. Abre
`portman/portman-config.json`, busca `orderOfOperations` y agrega tu ruta:

```json
    "orderOfOperations": [
      "GET::/hora",
      "POST::/clientes-sam",
      "GET::/clientes-sam",
      "GET::/clientes-sam/*",
      "PUT::/clientes-sam/*",
      "DELETE::/clientes-sam/*"
    ]
```

La puse primero porque no depende de nada. El orden importa: el `POST` de
clientes va antes que el `GET` de un cliente, porque primero hay que crearlo.

---

## Paso 7. Revisa todo antes de subir

Corre las tres verificaciones. Son exactamente las que correrá el pipeline:

```powershell
npm run lint        # estilo del código
npm run lint-api    # reglas del contrato
npm test            # las pruebas
```

**Si las tres pasan en tu máquina, casi seguro pasan en el pipeline.** Si
alguna falla, arréglala aquí: es mucho más rápido que esperar a que falle allá.

---

## Paso 8. Guarda tu trabajo (commit)

Un *commit* es una foto de tus cambios con un mensaje que dice qué hiciste.

```powershell
git status
```

Te muestra qué archivos cambiaste. Deben aparecer los cuatro: tu `index.mjs`,
tu prueba, `openapi.yaml`, `template.yaml` y `portman-config.json`.

```powershell
git add .
git commit -m "Agregar el endpoint GET /hora"
```

- `git add .` — marca todos los cambios para incluirlos
- `git commit -m "..."` — toma la foto con ese mensaje

> **El mensaje importa.** Escribe qué hiciste, no "cambios" ni "fix". Dentro de
> seis meses alguien va a leer ese mensaje buscando cuándo se agregó `/hora`.

---

## Paso 9. Sube tu rama (push)

```powershell
git push -u origin hora
```

Esto manda tu rama a GitHub. El `-u origin hora` sólo se necesita la primera
vez; después basta con `git push`.

**Importante: con esto todavía no se despliega nada.** El pipeline no escucha
ramas sueltas. Falta el paso 10.

---

## Paso 10. Abre el Pull Request

Un *Pull Request* (PR) es pedir que tus cambios se integren a `dev`. Además,
**es lo que dispara el despliegue**.

1. Entra a `https://github.com/joadva/demo`
2. Va a salir un aviso amarillo que dice **"hora had recent pushes"** con un
   botón **Compare & pull request**. Dale clic.
   (Si no aparece: pestaña **Pull requests** → **New pull request**)
3. Revisa la línea de arriba. Debe decir:

   ```
   base: dev  ←  compare: hora
   ```

   **Ojo con `base`.** Si dice `master`, cámbialo a `dev`. Es el error más
   común y hace que el despliegue no corra.

4. Ponle un título que se entienda: `Agregar el endpoint GET /hora`
5. Clic en **Create pull request**

---

## Paso 11. Mira cómo se despliega solo

En cuanto creas el PR, GitHub empieza a trabajar. Ve a la pestaña **Actions**
del repositorio y abre el run más reciente.

Vas a ver cuatro etapas, una tras otra:

```
① Pre-Deployment      ~1 min   lint + pruebas (lo mismo que corriste en el paso 7)
② Resolve Stack Name  ~5 seg   decide cómo se va a llamar tu ambiente
③ Deploy API          ~3 min   construye y crea todo en AWS
④ Post-Deployment     ~1 min   Portman prueba cada endpoint
```

### Tu propio ambiente, sólo para tu PR

Esto es lo más bonito del pipeline y conviene entenderlo: **tu PR levanta su
propia copia completa del API en AWS**, separada de la de todos los demás.

El nombre sale de tu rama: minúsculas, lo que no sea letra o número se vuelve
guion, y se corta a 9 caracteres.

| Tu rama | Tu ambiente |
|---|---|
| `hora` | `demo-secrets-hora` |
| `filtro-portman` | `demo-secrets-filtro-po` |
| `Mi_Feature` | `demo-secrets-mi-featur` |

Así puedes romper lo que quieras: no afectas a nadie.

### Cada commit nuevo vuelve a desplegar

Si algo falla y lo arreglas, no tienes que crear otro PR. Sólo:

```powershell
git add .
git commit -m "Corregir el nombre de la funcion"
git push
```

El PR se actualiza solo y el pipeline vuelve a correr de principio a fin. Eso es
lo que significa "se activa con el commit": **cada push a la rama del PR
dispara un despliegue nuevo.**

---

## Paso 12. Prueba tu endpoint de verdad

Cuando el run termine en verde, abre el job **Deploy API** y baja hasta el
resumen. Ahí está la URL de tu ambiente:

```
# API
* API: https://abc123xyz.execute-api.us-east-1.amazonaws.com/api
```

Pégale desde tu terminal:

```powershell
curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/api/hora
```

O ábrela en el navegador. Deberías ver:

```json
{"hora":"2026-09-29T18:24:05.123Z","zona":"UTC"}
```

**Felicidades: tu código está corriendo en AWS.**

---

## Paso 13. Mergea y limpia

Cuando alguien revise tu PR y lo apruebe, dale **Merge pull request**.

Al mergear pasan dos cosas solas:

1. Tus cambios entran a `dev` y se despliegan al ambiente compartido
   `secrets-dev`
2. **Tu ambiente temporal se borra.** El workflow `Cleanup Dev` corre solo y
   elimina `demo-secrets-hora` de AWS

No tienes que limpiar nada a mano. Y si cierras el PR sin mergear, también se
borra.

---

## Si tu Lambda necesita la base de datos

Todo lo anterior es igual. Sólo cambian dos cosas en `template.yaml`:

```yaml
      Timeout: 30                                    # ← conectar a MySQL tarda
      Environment:
        Variables:
          DATABASE_CONNECTION_SECRET: !Ref ReadSecretArn    # ← o WriteSecretArn
      Policies:
        - AWSLambdaBasicExecutionRole
        - Version: 2012-10-17
          Statement:
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource: !Ref ReadSecretArn                  # ← el mismo de arriba
```

**`ReadSecretArn` si tu Lambda sólo consulta** (GET). **`WriteSecretArn` si
modifica** (POST, PUT, DELETE). Son dos usuarios distintos de MySQL: así, si
un GET tuviera un error, no podría escribir en la base.

Y en tu código, en lugar de inventar datos:

```js
import { callProcedure } from '../../shared/database/index.mjs';

export const obtenerAlgo = async (id) => {
  const [fila] = await callProcedure('sp_algo_obtener', [id]);
  return fila ?? null;
};
```

No escribas SQL directo: siempre un stored procedure, declarado en `sql/`.
Copia `src/functions/clientesSam/get/index.mjs`, que es el ejemplo más corto.

---

## Cuando algo falla

| El pipeline dice… | Qué revisar |
|---|---|
| Falla en **Pre-Deployment** | Lo mismo falla en tu máquina. Corre `npm run lint` y `npm test` y arregla ahí |
| `Unresolved resource dependencies [HoraFunction]` | El nombre en `openapi.yaml` no coincide con el de `template.yaml` |
| `sam validate` falla | Sangría mal en `template.yaml`. Compara tu bloque con el de al lado |
| `npm run lint-api` falla | Falta `description`, `maxLength` o `minimum`/`maximum` en tu schema |
| `Operation must define parameter "{clienteId}"` | Tu ruta lleva algo entre llaves, como `/algo/{id}`, pero no declaraste ese parametro. Ve el bloque `parameters:` de `/clientes-sam/{clienteId}` y copialo |
| Todo verde pero el endpoint da **403 Missing Authentication Token** | La ruta no existe en el API. Revisa que `Path` y `Method` coincidan en los dos archivos |
| Todo verde pero da **500** | Tu código truena. Busca el error en CloudWatch → Log groups → `/aws/lambda/<tu-stack>-HoraFunction-...` |
| No corre nada al abrir el PR | El PR apunta a `master` en vez de a `dev` |

---

## Chuleta: todos los comandos juntos

```powershell
# 1. Rama nueva
git checkout dev
git pull
git checkout -b mi-endpoint

# 2. (escribes el código, la prueba, openapi.yaml y template.yaml)

# 3. Revisar
npm run lint
npm run lint-api
npm test

# 4. Subir
git add .
git commit -m "Agregar el endpoint GET /mi-endpoint"
git push -u origin mi-endpoint

# 5. Abrir el PR en GitHub hacia dev, y mirar Actions

# 6. Si algo falla: arreglar y repetir
git add .
git commit -m "Corregir X"
git push
```

## Resumen en una frase

**Escribes tres archivos que se apuntan entre sí, abres un PR hacia `dev`, y
GitHub construye y despliega tu propio ambiente en AWS. Cada commit que subas
lo vuelve a desplegar. Al cerrar el PR, se borra solo.**

---

Si quieres entender *por qué* funciona así y no sólo *cómo*, sigue con
`docs/manual.md`.
