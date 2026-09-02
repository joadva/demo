# Seguridad JWT en OpenAPI

Este API utiliza un esquema de seguridad basado en JWT (JSON Web Token) definido en la sección `securitySchemes` del OpenAPI spec:

```yaml
components:
  securitySchemes:
    jwt:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Aplicación de seguridad

- **Seguridad global:**
  Se puede aplicar seguridad JWT a todas las rutas del API añadiendo la siguiente sección a nivel raíz del spec:
  
  ```yaml
  security:
    - jwt: []
  ```
  Esto obliga a que todas las rutas requieran un token JWT válido, salvo que se sobrescriba a nivel de endpoint.

- **Seguridad por endpoint:**
  También es posible definir la seguridad solo en rutas específicas, agregando la sección `security` dentro de la definición del endpoint:
  
  ```yaml
  paths:
    /ruta:
      get:
        security:
          - jwt: []
  ```
  Esto permite que solo ciertas rutas requieran autenticación JWT.

> Si se define seguridad global y se omite la sección `security` en un endpoint, ese endpoint hereda la seguridad global. Si se define una sección `security: []` vacía en un endpoint, ese endpoint será público (sin autenticación).

---

## Integración con Portman para pruebas automatizadas

### Sobrescribir el securityScheme con `securityOverwrites`

Portman permite sobreescribir el securityScheme definido en el OpenAPI spec usando la propiedad `securityOverwrites` en el archivo `portman-config.json`. Esto es útil para pruebas automatizadas que requieren autenticación.

**Ejemplo:**

```json
"securityOverwrites": {
  "bearer": {
    "token": "{{accessToken|bearerToken}}"
  }
}
```

- `accessToken` o `bearerToken` serán reemplazados automáticamente por las variables de entorno `PORTMAN_ACCESS_TOKEN` o `PORTMAN_BEARER_TOKEN` respectivamente.

### Excluir endpoints de pruebas e2e con `operationIds`

En el archivo `portman-filter.json` se pueden añadir operationIds para excluir endpoints de las pruebas e2e:

```json
{
  "operationIds": ["echo", "reportPaymentOrdersSearch"]
}
```

Los operationIds listados serán excluidos de las pruebas generadas por Portman.

---

## Cómo correr las pruebas de Portman desde local

Para ejecutar las pruebas automatizadas de Portman de forma local, sigue estos pasos:

> **Nota:** Para obtener el Cognito UserPoolClientId, debe existir en tu cuenta de AWS una variable exportada (CloudFormation Export) cuyo nombre incluya `CognitoUserPoolClientId`.

1. **Obtener el Cognito Client ID:**

   Ejecuta el siguiente comando para obtener el Client ID de Cognito desde CloudFormation:
   
   ```sh
   COGNITO_CLIENT_ID=$(aws cloudformation --profile demo list-exports --query "Exports[?contains(Name, 'CognitoUserPoolClientId')].Value" --output text)
   ```

2. **Obtener un IdToken de Cognito:**

   Utiliza el Client ID obtenido para autenticarte y obtener un IdToken válido:
   
   ```sh
   ID_TOKEN=$(aws cognito-idp --profile demo initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id "$COGNITO_CLIENT_ID" --auth-parameters USERNAME="user@demo.mx",PASSWORD="MyPassword"|jq -r .AuthenticationResult.IdToken)
   ```

3. **Guardar el token en el archivo de entorno de Portman:**

   Exporta el token como variable de entorno para Portman:
   
   ```sh
   echo "PORTMAN_BEARER_TOKEN=$ID_TOKEN" >> portman/.env-portman
   ```

4. **Definir la URL base del API:**

   Asigna la URL base de tu API a una variable:
   
   ```sh
   API_URL=https://g78l2th0kl.execute-api.us-east-1.amazonaws.com/api
   ```

5. **Ejecutar las pruebas de Portman:**

   Lanza Portman usando la configuración y variables de entorno:
   
   ```sh
   npx @apideck/portman --cliOptionsFile ./portman/portman-cli.json --baseUrl $API_URL --envFile ./portman/.env-portman
   ```

Esto generará y ejecutará las pruebas e2e contra el API usando autenticación JWT obtenida dinámicamente desde Cognito.

---

## Cómo agregar un Authorizer Cognito en template.yaml

Para proteger tus endpoints con un authorizer de Cognito en una API definida en `template.yaml` (AWS SAM), debes agregar la configuración de authorizer en la sección `Resources` de la siguiente manera:

```yaml
Resources:
  API:
    Type: AWS::Serverless::Api
    Properties:
      StageName: api
      Auth:
        Authorizers:
          ClientCognitoAuthorizer:
            UserPoolArn: !Ref UserPoolArn
```

- `DefaultAuthorizer` define el authorizer que se aplicará por defecto a todos los endpoints.
- En `Authorizers`, se configura el authorizer de tipo Cognito, especificando el ARN del User Pool (`UserPoolArn`).
- Puedes referenciar el ARN del User Pool usando `!Ref` si está definido como recurso en el mismo template.

Esto asegura que todas las rutas protegidas requieran un JWT válido emitido por el User Pool configurado.

