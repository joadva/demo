-- Tabla y stored procedures de ejemplo para el CRUD de /clientes-sam.
-- Ejecutar una vez contra la base de datos apuntada por DBDatabase.
--
--   node scripts/db-init.mjs  # sin cliente mysql, ver docs/local-db.md
--   mysql -h <DBHost> -P <DBPort> -u <DBUser> -p <DBDatabase> < sql/clientesSam.sql
--
-- Cada procedimiento termina con un SELECT porque el helper callProcedure()
-- devuelve las filas del primer result set. Las columnas se aliasean a
-- camelCase para que el JSON coincida con los esquemas de openapi.yaml.

CREATE TABLE IF NOT EXISTS clientesSam (
  cliente_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(120) NOT NULL,
  email      VARCHAR(180) NOT NULL,
  telefono   VARCHAR(20)  NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente_id),
  UNIQUE KEY uq_clientesSam_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

DROP PROCEDURE IF EXISTS sp_clientesSam_listar;
DROP PROCEDURE IF EXISTS sp_clientesSam_obtener;
DROP PROCEDURE IF EXISTS sp_clientesSam_crear;
DROP PROCEDURE IF EXISTS sp_clientesSam_actualizar;
DROP PROCEDURE IF EXISTS sp_clientesSam_eliminar;

DELIMITER $$

-- GET /clientes-sam
CREATE PROCEDURE sp_clientesSam_listar(
  IN p_limite INT,
  IN p_offset INT
)
BEGIN
  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientesSam
  ORDER BY cliente_id DESC
  LIMIT p_limite OFFSET p_offset;
END$$

-- GET /clientes-sam/{clienteId}
CREATE PROCEDURE sp_clientesSam_obtener(
  IN p_cliente_id INT
)
BEGIN
  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientesSam
  WHERE cliente_id = p_cliente_id;
END$$

-- POST /clientes-sam
CREATE PROCEDURE sp_clientesSam_crear(
  IN p_nombre   VARCHAR(120),
  IN p_email    VARCHAR(180),
  IN p_telefono VARCHAR(20)
)
BEGIN
  INSERT INTO clientesSam (nombre, email, telefono)
  VALUES (p_nombre, p_email, p_telefono);

  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientesSam
  WHERE cliente_id = LAST_INSERT_ID();
END$$

-- PUT /clientes-sam/{clienteId}
-- No devuelve filas cuando el cliente no existe; el handler traduce eso a 404.
CREATE PROCEDURE sp_clientesSam_actualizar(
  IN p_cliente_id INT,
  IN p_nombre     VARCHAR(120),
  IN p_email      VARCHAR(180),
  IN p_telefono   VARCHAR(20)
)
BEGIN
  UPDATE clientesSam
  SET nombre   = p_nombre,
      email    = p_email,
      telefono = p_telefono
  WHERE cliente_id = p_cliente_id;

  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientesSam
  WHERE cliente_id = p_cliente_id;
END$$

-- DELETE /clientes-sam/{clienteId}
-- Devuelve cuantas filas se borraron para distinguir 204 de 404.
CREATE PROCEDURE sp_clientesSam_eliminar(
  IN p_cliente_id INT
)
BEGIN
  DELETE FROM clientesSam
  WHERE cliente_id = p_cliente_id;

  SELECT ROW_COUNT() AS eliminados;
END$$

DELIMITER ;
