# Usar un secreto y un Cognito de otra cuenta

Las Lambdas corren en la cuenta **A** (`074956368750`, la del pipeline). Los
recursos compartidos viven en la cuenta **B** (`222222222222` en los
ejemplos). Ambas en `us-east-1`. Si la región fuera distinta, cambia sólo lo
que se indica al final.

Índice:

1. [Secreto de Secrets Manager](#1-secreto-de-secrets-manager)
2. [Cognito como autorizador del API](#2-cognito-como-autorizador-del-api)
3. [Si además está en otra región](#3-si-además-está-en-otra-región)

---

## 1. Secreto de Secrets Manager

Hay que abrir **tres candados**. Si falta uno el error es
`AccessDeniedException` y no dice cuál (tabla de diagnóstico al final de la
sección).

### 1.1 En la cuenta B — llave KMS propia

Un secreto cifrado con la llave por omisión `aws/secretsmanager` **no se puede
leer desde otra cuenta**. Hace falta una llave administrada por el cliente
cuya política permita descifrar a la cuenta A:

```powershell
aws kms create-key --description "Secretos compartidos con demo" --policy '{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "Admin", "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::222222222222:root" },
      "Action": "kms:*", "Resource": "*" },
    { "Sid": "CuentaA", "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::074956368750:root" },
      "Action": ["kms:Decrypt", "kms:DescribeKey"], "Resource": "*" }
  ]
}'
```

Anota el `KeyId`. Si el secreto ya existe con la llave por omisión, cámbiale
la llave desde la consola (*Edit encryption key*); se recifra solo.

### 1.2 En la cuenta B — el secreto

Con el JSON que espera `src/shared/database/index.mjs`:

```powershell
aws secretsmanager create-secret --name demo/db --kms-key-id <KeyId> --secret-string '{
  "connectionDetails": {
    "host": "db.ejemplo.com", "user": "demo", "password": "xxx", "port": "3306", "database": "demo"
  }
}'
```

Anota el ARN completo, con su sufijo: `arn:aws:secretsmanager:us-east-1:222222222222:secret:demo/db-AbC123`.

### 1.3 En la cuenta B — política de recurso del secreto

Autoriza a la cuenta A completa; IAM en A decide después qué rol puede:

```powershell
aws secretsmanager put-resource-policy --secret-id demo/db --resource-policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::074956368750:root" },
    "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
    "Resource": "*"
  }]
}'
```

### 1.4 En la cuenta A — este repositorio

**`template.yaml`.** Los bloques ya están comentados en el archivo:

- en `Parameters`, `DatabaseSecretArn` y `DatabaseKmsKeyArn`;
- en `StatusFunction` (y en cada función del CRUD cuando se active), la
  variable `DATABASE_CONNECTION_SECRET` y la política con los dos ARN.

Al activarlos, los cinco parámetros `DBHost`…`DBDatabase` sobran, igual que
sus cinco secrets `DB_*` de GitHub y las cinco líneas de `samconfig.ci.yaml`
y `shared-deploy-api.yaml` que los reemplazan. En su lugar, dos secrets de
GitHub: `DATABASE_SECRET_ARN` y `DATABASE_KMS_KEY_ARN`.

**`src/shared/database/index.mjs`.** Descomentar el `import { getSecret }` y
la `createConnection` con Secrets Manager que ya está ahí. No cambia nada
para el caso de otra cuenta: `getSecret()` recibe el ARN completo y con eso
sabe a qué cuenta y región pedirlo.

### 1.5 Comprobar

Desde la cuenta A, con cualquier credencial que tenga los permisos del punto
1.4:

```powershell
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:us-east-1:222222222222:secret:demo/db-AbC123
```

| Error | Candado que falta |
|---|---|
| `not authorized to perform: secretsmanager:GetSecretValue` | política de recurso del secreto (B) o permiso IAM (A) |
| `... kms:Decrypt` / `Access to KMS is not allowed` | política de la llave (B) o permiso `kms:Decrypt` (A) |
| `encrypted with the default KMS key ... cannot be accessed from another account` | el secreto usa `aws/secretsmanager`; cambiarle la llave |

Dos notas:

- **Costo:** leer un secreto ajeno no crea ninguno en A (no se pagan los 0.40
  USD/mes), sólo llamadas (0.05 USD por 10,000). Con `maxAge: 300` en
  `getSecret` es despreciable.
- **El secreto da las credenciales, no el camino de red.** Si MySQL está en
  una VPC de B, hace falta IP pública con security group abierto a la Lambda,
  o VPC peering.

---

## 2. Cognito como autorizador del API

Aquí la sorpresa buena: **para validar tokens no hace falta ningún permiso
entre cuentas.** API Gateway comprueba la firma del JWT contra las llaves
públicas del user pool (`https://cognito-idp.us-east-1.amazonaws.com/<PoolId>/.well-known/jwks.json`),
que cualquiera puede leer. Sólo necesitas el **ARN del user pool** y el
**client id** de la app que emite los tokens.

Lo que sí cruza cuentas es **conseguir un token desde el pipeline** para que
Portman pruebe rutas protegidas (2.4).

### 2.1 En la cuenta B — lo que te tienen que dar

- ARN del user pool: `arn:aws:cognito-idp:us-east-1:222222222222:userpool/us-east-1_AbCdEf123`.
- Un *app client* para el frontend (sin secret, con `ALLOW_USER_SRP_AUTH`).
- Para Portman: un usuario de prueba y un *app client* con
  `ALLOW_ADMIN_USER_PASSWORD_AUTH`, más un rol en B que la cuenta A pueda
  asumir (2.4).

### 2.2 En `openapi.yaml`

Un `securityScheme` con la extensión de API Gateway, y `security` en cada
operación que se quiera proteger. El bloque ya está comentado al final de
`openapi.yaml`:

```yaml
components:
  securitySchemes:
    cognitoAuth:
      type: apiKey
      name: Authorization
      in: header
      x-amazon-apigateway-authtype: cognito_user_pools
      x-amazon-apigateway-authorizer:
        type: cognito_user_pools
        providerARNs:
          - arn:aws:cognito-idp:us-east-1:222222222222:userpool/us-east-1_AbCdEf123
```

```yaml
  /clientes:
    get:
      security:
        - cognitoAuth: []
```

El user pool debe estar en la **misma región** que el API; la cuenta puede
ser otra. Con eso, una petición sin token o con token inválido recibe el 401
de `UNAUTHORIZED` que ya está definido en `x-amazon-apigateway-gateway-responses`.

Como `openapi.yaml` no acepta parámetros de CloudFormation en texto plano, si
el ARN cambia por ambiente se escribe con `Fn::Sub` y un parámetro
`CognitoUserPoolArn` en `template.yaml`, igual que se hace con las Lambdas:

```yaml
        providerARNs:
          - Fn::Sub: ${CognitoUserPoolArn}
```

### 2.3 En el frontend

El navegador se autentica contra Cognito de B directamente (Hosted UI o
`amazon-cognito-identity-js`), obtiene el **id token** y lo manda en cada
llamada. En `frontend/lib/api.js` es una cabecera más:

```js
headers: { 'Content-Type': 'application/json', Authorization: idToken }
```

Para el autorizador de tipo `cognito_user_pools` el valor es el token a
secas, sin `Bearer`. El frontend necesita del pool B sólo el `PoolId` y el
`ClientId`, públicos, en variables `NEXT_PUBLIC_*`.

### 2.4 En el pipeline — un token para Portman

`post-deploy-validations.yaml` ya tiene el hueco comentado para generar
`portman/.env-portman` con `PORTMAN_BEARER_TOKEN`. Para pedirle el token a
Cognito de B, el rol del pipeline (cuenta A) asume un rol en B:

**En B**, un rol `demo-portman-auth` con esta confianza y el permiso
`cognito-idp:AdminInitiateAuth` sobre el pool:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::074956368750:role/gha-demo-dev-pipeline" },
    "Action": "sts:AssumeRole"
  }]
}
```

**En A**, `pipeline-bootstrap.yaml` le da a `gha-demo-dev-pipeline` el
permiso `sts:AssumeRole` sobre `arn:aws:iam::222222222222:role/demo-portman-auth`.

**En el workflow**, antes de correr Portman:

```yaml
      - name: Get Cognito token
        run: |
          creds=$(aws sts assume-role \
            --role-arn arn:aws:iam::222222222222:role/demo-portman-auth \
            --role-session-name portman --query Credentials --output json)
          export AWS_ACCESS_KEY_ID=$(echo "$creds" | jq -r .AccessKeyId)
          export AWS_SECRET_ACCESS_KEY=$(echo "$creds" | jq -r .SecretAccessKey)
          export AWS_SESSION_TOKEN=$(echo "$creds" | jq -r .SessionToken)

          token=$(aws cognito-idp admin-initiate-auth \
            --user-pool-id ${{ vars.COGNITO_USER_POOL_ID }} \
            --client-id ${{ vars.COGNITO_CLIENT_ID }} \
            --auth-flow ADMIN_USER_PASSWORD_AUTH \
            --auth-parameters USERNAME=${{ secrets.PORTMAN_USER }},PASSWORD=${{ secrets.PORTMAN_PASSWORD }} \
            --query AuthenticationResult.IdToken --output text)

          echo "PORTMAN_BEARER_TOKEN=$token" > portman/.env-portman
```

y en `portman/portman-cli.json` volver a poner `"envFile": "portman/.env-portman"`
con el `securityOverwrites` en `portman-config.json` que use esa variable.

### 2.5 Costo

El autorizador no cuesta. Cognito cobra por usuarios activos al mes en la
cuenta B (los primeros 10,000 gratis), así que la cuenta que paga es la dueña
del pool.

---

## 3. Si además está en otra región

- **Secreto:** `getSecret()` sigue funcionando con el ARN completo, pero el
  cliente debe apuntar a la región del secreto:
  ```js
  import { SecretsProvider } from '@aws-lambda-powertools/parameters/secrets';
  const secrets = new SecretsProvider({ clientConfig: { region: 'us-west-2' } });
  const secret = await secrets.get(process.env.DATABASE_CONNECTION_SECRET, { transform: 'json', maxAge: 300 });
  ```
  La llave KMS y la política de recurso son iguales. Cada lectura cruza de
  región: el `maxAge` deja de ser opcional.
- **Cognito:** el autorizador `cognito_user_pools` exige el pool en la misma
  región que el API. Si no lo está, la alternativa es un **Lambda
  authorizer** que valide el JWT contra el JWKS del pool (URL pública, sin
  permisos) — o pedir a B que cree el pool en la región del API.
