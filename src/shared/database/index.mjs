import mysql from 'mysql2/promise';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

import { logger } from '../lambda-powertools/index.mjs';

// Cada campo de conexion con los nombres que se le ven en la practica. El
// orden importa solo si un secreto trajera varios a la vez, cosa que no pasa.
const ALIAS = {
  host: ['host', 'DB_HOST'],
  user: ['user', 'username', 'DB_USER'],
  password: ['password', 'DB_PASS', 'DB_PASSWORD'],
  port: ['port', 'DB_PORT'],
  database: ['database', 'dbname', 'DB_NAME', 'DB_DATABASE']
};

/**
 * Convierte el JSON de un secreto en opciones para mysql2, aceptando las
 * formas en que suele venir:
 *
 *   - envuelto:    { "connectionDetails": { host, user, password, port, database } }
 *   - plano:       { host, user, password, port, database }
 *   - de RDS:      { host, username, password, port, dbname }  <- el que genera
 *                  AWS cuando deja que RDS administre el secreto
 *   - con prefijo: { DB_HOST, DB_USER, DB_PASS, DB_PORT, DB_NAME }
 *
 * Cuando el secreto no trae la base de datos se usa DB_DATABASE del entorno,
 * para no tener que rehacer un secreto ajeno solo por ese campo.
 * @param {Object} secret - JSON del secreto ya parseado.
 * @return {Object} Opciones de conexion para mysql2.
 */
export const leerCredenciales = (secret) => {
  const datos = secret?.connectionDetails ?? secret ?? {};
  const valor = (campo) => ALIAS[campo].map((alias) => datos[alias]).find((v) => v !== undefined && v !== '');

  const credenciales = {
    host: valor('host'),
    user: valor('user'),
    password: valor('password'),
    port: Number(valor('port') ?? 3306),
    database: valor('database') ?? process.env.DB_DATABASE
  };

  // Diagnostico de la forma del secreto. La contrasenia NO se registra: un log
  // de CloudWatch se conserva y lo lee cualquiera con acceso a la cuenta; con
  // saber si venia o no basta para localizar el problema.
  logger.info('Credenciales leidas del secreto', {
    clavesDelSecreto: Object.keys(datos),
    envuelto: Boolean(secret?.connectionDetails),
    host: credenciales.host,
    user: credenciales.user,
    port: credenciales.port,
    database: credenciales.database,
    tienePassword: Boolean(credenciales.password)
  });

  // Sin esto el fallo llega como un TypeError al destructurar, que no dice
  // cual de los campos falta ni en que forma venia el secreto.
  const faltantes = ['host', 'user', 'password', 'database']
      .filter((campo) => !credenciales[campo]);

  if (faltantes.length) {
    throw new Error(
        `El secreto no trae ${faltantes.join(', ')}. ` +
        `Claves recibidas: ${Object.keys(datos).join(', ') || '(ninguna)'}.`
    );
  }

  return credenciales;
};

/**
 * Lee las credenciales del secreto de Secrets Manager cuyo ARN llega en
 * DATABASE_CONNECTION_SECRET. template.yaml le pasa a cada funcion el secreto
 * de lectura o el de escritura segun lo que haga.
 *
 * getSecret() cachea el valor los segundos de maxAge, asi que invocaciones
 * seguidas en una misma Lambda tibia no vuelven a pegarle a la API.
 * @return {Promise<Object>} Opciones de conexion para mysql2.
 */
const credencialesDelSecreto = async () => {
  const arn = process.env.DATABASE_CONNECTION_SECRET;

  // Solo el nombre del secreto, no la cuenta ni la region: sirve para ver en
  // el log si a la funcion le llego el de lectura o el de escritura.
  logger.info('Leyendo el secreto', { secreto: arn.split(':secret:').at(-1) });

  const secret = await getSecret(arn, { transform: 'json', maxAge: 300 });

  return leerCredenciales(secret);
};

/**
 * Credenciales en variables de entorno. Es lo que usan los scripts locales
 * (scripts/demo-local.mjs) y sirve de alternativa si algun dia se quiere
 * prescindir de Secrets Manager: basta desplegar con las cinco variables DB*
 * que estan comentadas en template.yaml y no definir DATABASE_CONNECTION_SECRET.
 * @return {Object} Opciones de conexion para mysql2.
 */
const credencialesDelEntorno = () => ({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE
});

/**
 * Creates a connection to the MySQL database.
 * @return {Promise<mysql.Connection>} MySQL database connection.
 */
const createConnection = async () => {
  const credenciales = process.env.DATABASE_CONNECTION_SECRET
    ? await credencialesDelSecreto()
    : credencialesDelEntorno();

  return mysql.createConnection(credenciales);
};

/**
 * Executes a query in the database and closes the connection afterwards.
 * @param {mysql.Connection} connection - MySQL connection.
 * @param {string} sql - SQL query to execute.
 * @param {Array} params - Optional parameters for the query.
 * @return {Promise<Array>} Promise that resolves with the query results.
 */
const executeQuery = async (connection, sql, params) => {
  try {
    const [results] = await connection.query(sql, params);
    return Array.isArray(results) ? results.at(0) : results;
  } finally {
    // Close the connection whether the query succeeded or not
    await connection.end();
    logger.info('Connection db closed');
  }
};

/**
 * Calls a stored procedure and returns the rows of its first result set.
 * The procedure name is interpolated because MySQL does not accept it as a
 * placeholder; only pass names defined in the code, never user input.
 * @param {string} procedure - Name of the stored procedure.
 * @param {Array} params - Positional parameters for the procedure.
 * @return {Promise<Array>} Rows returned by the procedure.
 */
const callProcedure = async (procedure, params = []) => {
  const connection = await createConnection();
  try {
    const placeholders = params.map(() => '?').join(', ');
    const [result] = await connection.query(`CALL ${procedure}(${placeholders})`, params);
    // mysql2 devuelve [filas, ResultSetHeader] cuando el procedimiento hace un
    // SELECT, y solo el ResultSetHeader cuando no devuelve ningun result set.
    return Array.isArray(result) ? result[0] : [];
  } finally {
    await connection.end();
  }
};

export { callProcedure, createConnection, executeQuery };
