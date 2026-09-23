# Referencia: CRUD de /clientes-sam sobre stored procedures

El CRUD de `/clientes-sam` **esta desplegado**: sus rutas viven en `openapi.yaml`
y sus cinco funciones en `template.yaml`. Este documento se queda como
referencia de los bloques completos (por si hay que rehacerlos o copiarlos a
otro proyecto) y, sobre todo, por las secciones 5 y 6: que valida cada capa y
como se configura Portman.

- `src/functions/clientesSam/` — los 5 handlers, cada uno con sus funciones de
  validación y de acceso a datos en el mismo `index.mjs`, y sus pruebas en
  `tests/` (reglas, procedimiento y handler completo)
- `sql/clientesSam.sql` — la tabla y los 5 stored procedures
- `sql/seed.sql` — tres clientes de ejemplo

Para levantar la base ver `docs/local-db.md`.

---

## 1. `openapi.yaml` — el tag

Va dentro de `tags:`, junto a `Tool`.

```yaml
  - name: ClientesSam
    description: CRUD de ejemplo sobre la tabla clientesSam vía stored procedures
```

## 2. `openapi.yaml` — las rutas

Van dentro de `paths:`, después de `/echo`.

```yaml
  /clientes-sam:
    get:
      summary: List clientes
      operationId: listClientesSam
      description: |
        Returns a paginated list of clientes via the sp_clientesSam_listar
        stored procedure.
      tags:
        - ClientesSam
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
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ListClientesSamFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    post:
      summary: Create a cliente
      operationId: createClienteSam
      description: |
        Creates a cliente via the sp_clientesSam_crear stored procedure and
        returns the resulting row.
      tags:
        - ClientesSam
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
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateClienteSamFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

  /clientes-sam/{clienteId}:
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
      operationId: getClienteSam
      description: |
        Returns a single cliente via the sp_clientesSam_obtener stored procedure.
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
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetClienteSamFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    put:
      summary: Update a cliente
      operationId: updateClienteSam
      description: |
        Replaces the editable fields of a cliente via the
        sp_clientesSam_actualizar stored procedure.
      tags:
        - ClientesSam
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
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${UpdateClienteSamFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy

    delete:
      summary: Delete a cliente
      operationId: deleteClienteSam
      description: |
        Deletes a cliente via the sp_clientesSam_eliminar stored procedure.
      tags:
        - ClientesSam
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
          Fn::Sub: arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${DeleteClienteSamFunction.Arn}/invocations
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
  ListClientesSamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientesSam/list
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes-sam
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

  GetClienteSamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientesSam/get
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes-sam/{clienteId}
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

  CreateClienteSamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientesSam/create
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes-sam
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

  UpdateClienteSamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientesSam/update
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes-sam/{clienteId}
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

  DeleteClienteSamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/functions/clientesSam/delete
      Handler: index.handler
      Timeout: 30
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref API
            Path: /clientes-sam/{clienteId}
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

Portman exige 2xx en cada operación, y el CRUD sólo responde 2xx si la base
está viva y con los procedimientos cargados. La configuración actual encadena
las cinco operaciones para que se prueben en un solo recorrido.

En `portman/portman-config.json`:

- **`globals.orderOfOperations`** pone el POST primero, porque los demás
  necesitan un cliente existente: `POST /clientes-sam` → `GET /clientes-sam` →
  `GET /clientes-sam/{clienteId}` → `PUT /clientes-sam/{clienteId}` →
  `DELETE /clientes-sam/{clienteId}`. El DELETE al final deja la tabla como estaba.
- **`assignVariables`** guarda el `clienteId` que devuelve el POST en una
  variable de colección.
- **`overwrites`** hace dos cosas. Inyecta ese `{{clienteId}}` en las rutas con
  parámetro: sin eso Portman usaría un id inventado a partir del schema y
  daría 404. Y reemplaza el correo por `portman-{{$timestamp}}@demo.mx`: sin
  eso mandaría siempre el mismo valor generado y la segunda corrida chocaría
  con el `UNIQUE` de la tabla (409).

En `portman/portman-filter.json` la lista `operationIds` está vacía. Recuerda
que esa lista **excluye**: lo que pongas ahí es lo que NO se prueba.

### Fuzzing de los 400

Los `variationTests` quitan campos requeridos y comprueban que la respuesta
cumpla `validationError`. Las variaciones por longitud (`minLengthFields` y
`maxLengthFields`) están **desactivadas** a propósito: Portman 1.x truena al
generarlas cuando el schema trae `minLength` o `maxLength`, con un
`TypeError: Cannot read properties of undefined (reading 'city')` en su
Fuzzer. Si alguna vez lo arreglan, se vuelven a encender ahí mismo.
