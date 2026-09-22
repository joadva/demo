# Base de datos para el CRUD de /clientes

El CRUD de `src/functions/clientes/` necesita un MySQL con la tabla y los
stored procedures de `sql/clientes.sql`. Hay dos escenarios:

| Quiero… | Necesito |
|---|---|
| Ver el CRUD funcionando en mi máquina, sin AWS | Un MySQL local (Docker) y `npm run demo` |
| Que las Lambdas desplegadas lo usen | Un MySQL accesible desde internet y sus credenciales en GitHub |

## 1. Local con Docker

Requiere [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/).

```powershell
docker compose up -d       # MySQL 8.4 en 127.0.0.1:3306, usuario demo / demo, base demo
npm run demo               # corre el CRUD completo contra ella
docker compose down -v     # la destruye, datos incluidos
```

La primera vez que arranca, el contenedor ejecuta solo `sql/clientes.sql`
(tabla + 5 procedimientos) y `sql/seed.sql` (3 clientes de ejemplo). Los
scripts **no se vuelven a ejecutar** mientras el volumen exista; si cambias un
procedimiento, vuelve a aplicarlos con:

```powershell
npm run db:init
```

`db:init` usa `mysql2`, así que no hace falta el cliente `mysql`; entiende los
`DELIMITER $$` del script.

### Qué hace `npm run demo`

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
tipos, longitudes): eso solo ocurre con el API desplegado. Por eso el 400 de
"rompe reglas" muestra las reglas de la Lambda, no las del schema.

### Consultar la base a mano

Sin cliente `mysql` instalado, el del contenedor sirve:

```powershell
docker exec -it demo-mysql mysql -udemo -pdemo demo
```

```sql
CALL sp_clientes_listar(10, 0);
CALL sp_clientes_crear('Ana', 'ana2@demo.mx', NULL);
SELECT * FROM clientes;
```

## 2. Otra base (nube) para las Lambdas desplegadas

Las Lambdas corren en AWS, así que la base local no les sirve: necesitan un
MySQL con IP pública o dentro de la misma VPC. Opciones sin costo para una
demo, de más a menos recomendable:

- **Amazon RDS MySQL** en la capa gratuita (`db.t4g.micro`, 12 meses en
  cuentas nuevas). Marca *Public access: Yes* y abre el puerto 3306 en su
  security group. Es la opción "real": misma región, misma cuenta.
- **Aiven for MySQL**, plan Free. Soporta stored procedures; da host, puerto,
  usuario y contraseña listos. Añade `ssl: { rejectUnauthorized: true }` a
  `createConnection` en `src/shared/database/index.mjs` si lo exige.

Evita TiDB Serverless / PlanetScale: son compatibles con MySQL pero **no
soportan stored procedures**.

Con la base creada:

1. Pon sus credenciales en `.env.local` (copia `.env.local.example`) y carga
   el esquema: `npm run db:init`. Comprueba con `npm run demo`.
2. Guarda las credenciales en dos secretos de Secrets Manager (uno con un
   usuario de solo lectura y otro con uno que pueda escribir) y pon sus ARN
   en los secrets `READ_SECRET_DB` y `WRITE_SECRET_DB` del Environment `dev`
   en GitHub. El JSON del secreto va asi:

   ```json
   { "connectionDetails": { "host": "...", "user": "...", "password": "...", "port": "3306", "database": "..." } }
   ```
3. Despliega: las rutas `/clientes` ya estan en `openapi.yaml` y
   `template.yaml`.

`.env.local` está en `.gitignore`; nunca lo subas.
