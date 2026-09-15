// Utilidades compartidas por los scripts de base de datos local.

/**
 * Credenciales para conectarse a la base de datos: las variables DB_* si
 * existen (por ejemplo desde .env.local), y si no, las del docker-compose.yaml.
 * @return {Object} Opciones para mysql.createConnection.
 */
export const conexionLocal = () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'demo',
  password: process.env.DB_PASSWORD || 'demo',
  database: process.env.DB_DATABASE || 'demo'
});

/**
 * Divide un script en sentencias respetando DELIMITER, como haria el cliente
 * mysql. Los comentarios se dejan pasar; MySQL los ignora.
 * @param {string} script - Contenido del archivo .sql.
 * @return {Array<string>} Sentencias listas para ejecutarse una por una.
 */
export const separarSentencias = (script) => {
  const sentencias = [];
  let delimitador = ';';
  let buffer = '';

  for (const linea of script.split(/\r?\n/)) {
    const cambio = linea.trim().match(/^DELIMITER\s+(\S+)$/i);
    if (cambio) {
      delimitador = cambio[1];
      continue;
    }

    buffer += linea + '\n';

    if (buffer.trimEnd().endsWith(delimitador)) {
      const sentencia = buffer.trimEnd().slice(0, -delimitador.length).trim();
      if (sentencia) {
        sentencias.push(sentencia);
      }
      buffer = '';
    }
  }

  return sentencias;
};
