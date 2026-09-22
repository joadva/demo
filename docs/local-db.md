# Base de datos para el CRUD de /clientes

El CRUD de `src/functions/clientes/` necesita un MySQL con la tabla y los
stored procedures de `sql/clientes.sql`. Hay dos escenarios:

| Quiero… | Necesito |
|---|---|
| Probar el CRUD desde mi máquina, sin AWS | Un MySQL accesible y `scripts/demo-local.mjs` |
| Que las Lambdas desplegadas lo usen | Ese MySQL alcanzable desde internet y sus credenciales en dos secretos de Secrets Manager |

## 1. Cargar el esquema

`scripts/db-init.mjs` aplica los `.sql` con `mysql2`, así que no hace falta el
cliente `mysql` instalado (es el único que entiende los `DELIMITER $$` del
script).

Pon las credenciales en las variables `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD` y `DB_DATABASE` — lo más cómodo es un archivo `.env.local`, que
está en `.gitignore`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=demo
DB_PASSWORD=demo
DB_DATABASE=demo
```

```powershell
node --env-file-if-exists=.env.local scripts/db-init.mjs
```

Aplica `sql/clientes.sql` (tabla + 5 procedimientos) y `sql/seed.sql` (3
clientes de ejemplo). Se puede repetir las veces que haga falta: los
procedimientos se recrean y los correos ya existentes se ignoran.

También acepta archivos concretos:

```powershell
node --env-file-if-exists=.env.local scripts/db-init.mjs sql/clientes.sql
```

## 2. Probar el CRUD completo

```powershell
node --env-file-if-exists=.env.local scripts/demo-local.mjs
```

Invoca los cinco handlers reales — con Powertools y `mysql2`, exactamente el
código que se despliega — simulando los eventos que mandaría API Gateway, y
muestra cada respuesta:

```
GET /clientes?limite=5
  -> 200 {"clientes":[...]}

POST /clientes  (demo-1789508658596@demo.mx)
  -> 201 {"clienteId":4,"nombre":"Pedro Paramo","email":"demo-...@demo.mx",...}

POST /clientes  (mismo correo -> 409)
  -> 409 {"message":"Ya existe un cliente con ese correo"}

POST /clientes  (rompe reglas -> 400)
  -> 400 {"message":"Datos invalidos","errores":[{"campo":"nombre",...},{"campo":"email",...}]}

GET /clientes/abc  (-> 400)
  -> 400 {"message":"Datos invalidos","errores":[{"campo":"clienteId","mensaje":"Debe ser un entero positivo"}]}
...
DELETE /clientes/4
  -> 204 null

GET /clientes/4  (ya no existe -> 404)
  -> 404 {"message":"Cliente no encontrado"}
```

Lo que no se ve aquí es la validación de API Gateway (campos requeridos,
tipos, longitudes): eso sólo ocurre con el API desplegado. Por eso el 400 de
"rompe reglas" muestra las reglas de la Lambda, no las del schema.

`createConnection` usa estas variables `DB_*` sólo cuando no existe
`DATABASE_CONNECTION_SECRET`; en AWS siempre existe, así que las Lambdas
desplegadas leen el secreto (punto 3).

## 3. Darle la base a las Lambdas desplegadas

Las Lambdas corren en AWS, así que necesitan un MySQL con IP pública o dentro
de la misma VPC. Opciones sin costo para una demo, de más a menos recomendable:

- **Amazon RDS MySQL** en la capa gratuita (`db.t4g.micro`, 12 meses en
  cuentas nuevas). Marca *Public access: Yes* y abre el puerto 3306 en su
  security group. Es la opción "real": misma región, misma cuenta.
- **Aiven for MySQL**, plan Free. Soporta stored procedures; da host, puerto,
  usuario y contraseña listos.

Evita TiDB Serverless / PlanetScale: son compatibles con MySQL pero **no
soportan stored procedures**.

Con la base creada:

1. Carga el esquema con el punto 1 y compruébalo con el punto 2.
2. Crea **dos usuarios de MySQL**, uno con permisos de sólo lectura y otro que
   pueda escribir, y guarda cada uno en un secreto de Secrets Manager con este
   JSON:

   ```json
   { "connectionDetails": { "host": "...", "user": "...", "password": "...", "port": "3306", "database": "..." } }
   ```

3. Pon los ARN de esos secretos en los secrets `READ_SECRET_DB` y
   `WRITE_SECRET_DB` del Environment `dev` en GitHub. El pipeline los pasa a
   `template.yaml`, que le da a cada Lambda el que le toca: los GET leen, los
   POST/PUT/DELETE escriben.

Si el secreto vive en otra cuenta de AWS, hace falta además una llave KMS
propia y permisos cruzados: ver `docs/recursos-otra-cuenta.md`.
