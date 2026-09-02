# Ejemplo: CRUD de /clientes sobre stored procedures

Este CRUD estuvo desplegado y se retiró del API para que el ejemplo funcione
de punta a punta sin depender de una base de datos: hoy sólo se despliegan
Lambdas que no tocan MySQL, así todos los endpoints responden 200 y Portman
pasa completo.

**El código sigue en el repositorio y sus pruebas siguen corriendo:**

- `src/functions/clientes/` — los 5 handlers, cada uno con su función de acceso
  a datos y sus pruebas en `tests/`
- `sql/clientes.sql` — la tabla y los 5 stored procedures

Lo único que se quitó son las definiciones de infraestructura. Para reactivarlo:

1. Crea la base de datos y ejecuta `sql/clientes.sql` contra ella.
2. Pon las credenciales reales en los secrets `DB_*` del Environment `dev`.
3. Pega los bloques de abajo en `openapi.yaml` y `template.yaml`.

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
                      $ref: '#/components/schemas/cliente'
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
              $ref: '#/components/schemas/clienteInput'
      responses:
        '201':
          description: 'Created'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/cliente'
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
                $ref: '#/components/schemas/cliente'
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
              $ref: '#/components/schemas/clienteInput'
      responses:
        '200':
          description: 'Success'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/cliente'
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

## 3. `openapi.yaml` — los esquemas

Van dentro de `components.schemas:`.

```yaml
    cliente:
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

    clienteInput:
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
          maxLength: 20
```

## 4. `openapi.yaml` — las respuestas compartidas

Van dentro de `components.responses:`, junto a `unexpectedError`.

```yaml
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

## 5. `template.yaml` — las cinco funciones

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
