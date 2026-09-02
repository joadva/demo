-- Tabla y stored procedures de ejemplo para el CRUD de /clientes.
-- Ejecutar una vez contra la base de datos apuntada por DBDatabase.
--
--   mysql -h <DBHost> -P <DBPort> -u <DBUser> -p <DBDatabase> < sql/clientes.sql
--
-- Cada procedimiento termina con un SELECT porque el helper callProcedure()
-- devuelve las filas del primer result set. Las columnas se aliasean a
-- camelCase para que el JSON coincida con los esquemas de openapi.yaml.

CREATE TABLE IF NOT EXISTS clientes (
  cliente_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(120) NOT NULL,
  email      VARCHAR(180) NOT NULL,
  telefono   VARCHAR(20)  NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente_id),
  UNIQUE KEY uq_clientes_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

DROP PROCEDURE IF EXISTS sp_clientes_listar;
DROP PROCEDURE IF EXISTS sp_clientes_obtener;
DROP PROCEDURE IF EXISTS sp_clientes_crear;
DROP PROCEDURE IF EXISTS sp_clientes_actualizar;
DROP PROCEDURE IF EXISTS sp_clientes_eliminar;

DELIMITER $$

-- GET /clientes
CREATE PROCEDURE sp_clientes_listar(
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
  FROM clientes
  ORDER BY cliente_id DESC
  LIMIT p_limite OFFSET p_offset;
END$$

-- GET /clientes/{clienteId}
CREATE PROCEDURE sp_clientes_obtener(
  IN p_cliente_id INT
)
BEGIN
  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientes
  WHERE cliente_id = p_cliente_id;
END$$

-- POST /clientes
CREATE PROCEDURE sp_clientes_crear(
  IN p_nombre   VARCHAR(120),
  IN p_email    VARCHAR(180),
  IN p_telefono VARCHAR(20)
)
BEGIN
  INSERT INTO clientes (nombre, email, telefono)
  VALUES (p_nombre, p_email, p_telefono);

  SELECT
    cliente_id AS clienteId,
    nombre,
    email,
    telefono,
    creado_en  AS creadoEn
  FROM clientes
  WHERE cliente_id = LAST_INSERT_ID();
END$$

-- PUT /clientes/{clienteId}
-- No devuelve filas cuando el cliente no existe; el handler traduce eso a 404.
CREATE PROCEDURE sp_clientes_actualizar(
  IN p_cliente_id INT,
  IN p_nombre     VARCHAR(120),
  IN p_email      VARCHAR(180),
  IN p_telefono   VARCHAR(20)
)
BEGIN
  UPDATE clientes
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
  FROM clientes
  WHERE cliente_id = p_cliente_id;
END$$

-- DELETE /clientes/{clienteId}
-- Devuelve cuantas filas se borraron para distinguir 204 de 404.
CREATE PROCEDURE sp_clientes_eliminar(
  IN p_cliente_id INT
)
BEGIN
  DELETE FROM clientes
  WHERE cliente_id = p_cliente_id;

  SELECT ROW_COUNT() AS eliminados;
END$$

DELIMITER ;
