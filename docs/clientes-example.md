# Ejemplo: CRUD de /clientes sobre stored procedures

Este CRUD estuvo desplegado y se retiró del API para que el ejemplo funcione
de punta a punta sin depender de una base de datos: hoy sólo se despliegan
Lambdas que no tocan MySQL, así todos los endpoints responden 200 y Portman
pasa completo.

**El código sigue en el repositorio y sus pruebas siguen corriendo:**

- `src/functions/clientes/` — los 5 handlers, cada uno con sus funciones de
  validación y de acceso a datos en el mismo `index.mjs`, y sus pruebas en
  `tests/` (reglas, procedimiento y handler completo)
- `sql/clientes.sql` — la tabla y los 5 stored procedures

Lo único que se quitó son las definiciones de infraestructura. Los schemas van
escritos dentro de cada operación (no en `components.schemas`), así cada ruta
se lee completa en un solo lugar. Para reactivarlo:

1. Crea la base de datos y carga `sql/clientes.sql` con `npm run db:init`
   (ver `docs/local-db.md`: Docker local para probar, o una MySQL en la nube
   para las Lambdas desplegadas).
2. Pon las credenciales reales en los secrets `DB_*` del Environment `dev`.
3. Pega los bloques de abajo en `openapi.yaml` y `template.yaml`.
4. Lee la sección 5 para saber qué valida cada capa, y la 6 antes de correr
   Portman.

---

## 1. `openapi.yaml` — el tag

Va dentro de `tags:`, junto a `Tool`.

```yaml
  - name: Clientes
    description: CRUD de ejemplo sobre la tabla clientes vía stored procedures
```

## 2. `openapi.yaml` — las rutas

Van dentro de `paths:`, después de `/echo`.

```yaml
  /clientes:
    get:
      summary: List clientes
      operationId: listClientes
      description: |
        Returns a paginated list of clientes via the sp_clientes_listar
        stored procedure.
      tags:
        - Clientes
      parameters:
        - name: limite
          in: query
          required: false
          description: Maximum number of rows to return.
          schema:
            type: integer
            minimum: 1
            maximum: 200
            default: 50
        - name: offset
          in: query
          required: false
          description: Number of rows to skip before collecting the result set.
          schema:
            type: integer
            minimum: 0
            maximum: 1000000
            default: 0
      responses:
        '200':
          description: 'Success'
          content:
            application/json:
              schema:
                type: object
                required:
                  - clientes
                properties:
                  clientes:
                    type: array
                    maxItems: 200
                    items:
                      type: object
                      required:
                        - clienteId
                        - nombre
                        - email
                      properties:
                        clienteId:
                          type: integer
                          minimum: 1
                          maximum: 2147483647
                        nombre:
                          type: string
                          maxLength: 120
                        email:
                          type: string
                          format: email
                          maxLength: 180
                        telefono:
                          type: string
                          nullable: true
                          maxLength: 20
                        creadoEn:
                          type: string
                          format: date-time
        '400':
          $ref: '#/components/responses/validationError'
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ListClientesFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    post:
      summary: Create a cliente
      operationId: createCliente
      description: |
        Creates a cliente via the sp_clientes_crear stored procedure and
        returns the resulting row.
      tags:
        - Clientes
      requestBody:
        required: true
        content:
          application/json:
            schema:
              # Todo lo que esta aqui lo rechaza API Gateway antes de invocar la Lambda.
              # Ojo: `format: email` solo documenta; el gateway NO lo valida. Por eso el
              # formato del correo se revisa en la Lambda (ver seccion 5).
              type: object
              additionalProperties: false
              required:
                - nombre
                - email
              properties:
                nombre:
                  type: string
                  minLength: 1
                  maxLength: 120
                email:
                  type: string
                  format: email
                  minLength: 3
                  maxLength: 180
                telefono:
                  type: string
                  nullable: true
                  pattern: '^[0-9]{10}$'
                  maxLength: 10
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              schema:
                type: object
                required:
                  - clienteId
                  - nombre
                  - email
                properties:
                  clienteId:
                    type: integer
                    minimum: 1
                    maximum: 2147483647
                  nombre:
                    type: string
                    maxLength: 120
                  email:
                    type: string
                    format: email
                    maxLength: 180
                  telefono:
                    type: string
                    nullable: true
                    maxLength: 20
                  creadoEn:
                    type: string
                    format: date-time
        '400':
          $ref: '#/components/responses/validationError'
        '409':
          $ref: '#/components/responses/conflict'
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateClienteFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

  /clientes/{clienteId}:
    parameters:
      - name: clienteId
        in: path
        required: true
        description: Identifier of the cliente.
        schema:
          type: integer
          minimum: 1
          maximum: 2147483647

    get:
      summary: Get a cliente
      operationId: getCliente
      description: |
        Returns a single cliente via the sp_clientes_obtener stored procedure.
      tags:
        - Clientes
      responses:
        '200':
          description: 'Success'
          content:
            application/json:
              schema:
                type: object
                required:
                  - clienteId
                  - nombre
                  - email
                properties:
                  clienteId:
                    type: integer
                    minimum: 1
                    maximum: 2147483647
                  nombre:
                    type: string
                    maxLength: 120
                  email:
                    type: string
                    format: email
                    maxLength: 180
                  telefono:
                    type: string
                    nullable: true
                    maxLength: 20
                  creadoEn:
                    type: string
                    format: date-time
        '400':
          $ref: '#/components/responses/validationError'
        '404':
          $ref: '#/components/responses/notFound'
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetClienteFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    put:
      summary: Update a cliente
      operationId: updateCliente
      description: |
        Replaces the editable fields of a cliente via the
        sp_clientes_actualizar stored procedure.
      tags:
        - Clientes
      requestBody:
        required: true
        content:
          application/json:
            schema:
              # Todo lo que esta aqui lo rechaza API Gateway antes de invocar la Lambda.
              # Ojo: `format: email` solo documenta; el gateway NO lo valida. Por eso el
              # formato del correo se revisa en la Lambda (ver seccion 5).
              type: object
              additionalProperties: false
              required:
                - nombre
                - email
              properties:
                nombre:
                  type: string
                  minLength: 1
                  maxLength: 120
                email:
                  type: string
                  format: email
                  minLength: 3
                  maxLength: 180
                telefono:
                  type: string
                  nullable: true
                  pattern: '^[0-9]{10}$'
                  maxLength: 10
      responses:
        '200':
          description: 'Success'
          content:
            application/json:
              schema:
                type: object
                required:
                  - clienteId
                  - nombre
                  - email
                properties:
                  clienteId:
                    type: integer
                    minimum: 1
                    maximum: 2147483647
                  nombre:
                    type: string
                    maxLength: 120
                  email:
                    type: string
                    format: email
                    maxLength: 180
                  telefono:
                    type: string
                    nullable: true
                    maxLength: 20
                  creadoEn:
                    type: string
                    format: date-time
        '400':
          $ref: '#/components/responses/validationError'
        '404':
          $ref: '#/components/responses/notFound'
        '409':
          $ref: '#/components/responses/conflict'
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${UpdateClienteFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    delete:
      summary: Delete a cliente
      operationId: deleteCliente
      description: |
        Deletes a cliente via the sp_clientes_eliminar stored procedure.
      tags:
        - Clientes
      responses:
        '204':
          description: 'No Content'
        '400':
          $ref: '#/components/responses/validationError'
        '404':
          $ref: '#/components/responses/notFound'
        '500':
          $ref: '#/components/responses/unexpectedError'
      x-amazon-apigateway-request-validator: Validate body, query string parameters, and headers
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${DeleteClienteFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy
```

## 3. `openapi.yaml` — las respuestas compartidas

Van dentro de `components.responses:`, junto a `unexpectedError`.

```yaml
    # Un 400 puede venir de dos lugares con dos formas distintas:
    #   - API Gateway (schema):  { message, detalle }
    #   - la Lambda (negocio):   { message, errores: [{ campo, mensaje }] }
    # Solo `message` es obligatorio para que el schema cubra ambas.
    validationError:
      description: Validation error
      content:
        application/json:
          schema:
            type: object
            required:
              - message
            properties:
              message:
                type: string
                maxLength: 200
              detalle:
                type: string
                maxLength: 2000
              errores:
                type: array
                maxItems: 20
                items:
                  type: object
                  required:
                    - campo
                    - mensaje
                  properties:
                    campo:
                      type: string
                      maxLength: 60
                    mensaje:
                      type: string
                      maxLength: 200

    notFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            required:
              - message
            properties:
              message:
                type: string

    conflict:
      description: Conflict with the current state of the resource
      content:
        application/json:
          schema:
            type: object
            required:
              - message
            properties:
              message:
                type: string
```

## 4. `template.yaml` — las cinco funciones

Van dentro de `Resources:`, después de `StatusFunction`.

```yaml
  ListClientesFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientes/list
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes
            Method: GET
      Environment:
        Variables:
          DB_HOST: !Ref DBHost
          DB_USER: !Ref DBUser
          DB_PASSWORD: !Ref DBPassword
          DB_PORT: !Ref DBPort
          DB_DATABASE: !Ref DBDatabase
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

  GetClienteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientes/get
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes/{clienteId}
            Method: GET
      Environment:
        Variables:
          DB_HOST: !Ref DBHost
          DB_USER: !Ref DBUser
          DB_PASSWORD: !Ref DBPassword
          DB_PORT: !Ref DBPort
          DB_DATABASE: !Ref DBDatabase
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

  CreateClienteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientes/create
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes
            Method: POST
      Environment:
        Variables:
          DB_HOST: !Ref DBHost
          DB_USER: !Ref DBUser
          DB_PASSWORD: !Ref DBPassword
          DB_PORT: !Ref DBPort
          DB_DATABASE: !Ref DBDatabase
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

  UpdateClienteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientes/update
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes/{clienteId}
            Method: PUT
      Environment:
        Variables:
          DB_HOST: !Ref DBHost
          DB_USER: !Ref DBUser
          DB_PASSWORD: !Ref DBPassword
          DB_PORT: !Ref DBPort
          DB_DATABASE: !Ref DBDatabase
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

  DeleteClienteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientes/delete
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes/{clienteId}
            Method: DELETE
      Environment:
        Variables:
          DB_HOST: !Ref DBHost
          DB_USER: !Ref DBUser
          DB_PASSWORD: !Ref DBPassword
          DB_PORT: !Ref DBPort
          DB_DATABASE: !Ref DBDatabase
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

## 5. Reglas de validación — quién valida qué

Hay dos capas y cada regla vive en una sola:

| Regla | Dónde | Por qué |
|---|---|---|
| `nombre` y `email` obligatorios | OpenAPI (`required`) | El gateway lo rechaza sin invocar la Lambda |
| tipos, `maxLength`, campos desconocidos | OpenAPI (`type`, `maxLength`, `additionalProperties: false`) | idem |
| `telefono` de 10 dígitos | OpenAPI (`pattern`) | idem |
| `clienteId` entero positivo | Lambda (`validarClienteId`) | El gateway sólo comprueba que el parámetro de ruta exista, no su tipo |
| `limite` 1..200, `offset` ≥ 0 | Lambda (`validarPaginacion`) | Igual: los parámetros de query no se tipan |
| `nombre` con al menos 2 caracteres reales | Lambda (`validarCliente`) | El schema no puede recortar espacios |
| formato del correo | Lambda (`validarCliente`) | API Gateway ignora `format: email` |
| correo repetido | Lambda (captura `ER_DUP_ENTRY` → 409) | Lo sabe la base de datos |

Además `normalizarCliente` recorta espacios y pasa el correo a minúsculas antes
de validar y de llamar al procedimiento, para que `Ana@Demo.mx` y `ana@demo.mx`
sean el mismo cliente frente al `UNIQUE` de la tabla.

Las dos capas responden 400 con formas distintas; el frontend distingue por la
presencia de `errores`:

```json
{ "message": "Solicitud invalida", "detalle": "[object has missing required properties ([\"email\"])]" }
```

```json
{ "message": "Datos invalidos", "errores": [{ "campo": "email", "mensaje": "El correo no tiene un formato valido" }] }
```

La primera la arma la plantilla `BAD_REQUEST_BODY` de `openapi.yaml`; la
segunda, la Lambda. Ninguna regla se repite en las dos capas: si el gateway ya
rechazó el cuerpo, la Lambda nunca lo ve.

## 6. Portman

Portman exige 2xx en cada operación. Mientras no haya base de datos, al
reactivar estas rutas hay que excluirlas del run en `portman/portman-filter.json`
(la lista `operationIds` **excluye**):

```json
{ "operationIds": ["listClientes", "createCliente", "getCliente", "updateCliente", "deleteCliente"] }
```

Con base de datos, vacía la lista y agrega las operaciones a
`globals.orderOfOperations` en `portman/portman-config.json` (POST antes que
GET/PUT/DELETE para que exista el registro). Los `variationTests` ya
configurados harán fuzzing de los 400: quitan campos requeridos y acortan o
alargan cadenas, y comprueban que la respuesta cumpla `validationError`.
