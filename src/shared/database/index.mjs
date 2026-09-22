import mysql from 'mysql2/promise';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

import { logger } from '../lambda-powertools/index.mjs';

/**
 * Lee las credenciales del secreto de Secrets Manager cuyo ARN llega en
 * DATABASE_CONNECTION_SECRET. template.yaml le pasa a cada funcion el secreto
 * de lectura o el de escritura segun lo que haga.
 *
 * El secreto guarda un JSON con esta forma:
 *   { "connectionDetails": {
 *       "host": "...", "user": "...", "password": "...",
 *       "port": "3306", "database": "..." } }
 *
 * getSecret() cachea el valor los segundos de maxAge, asi que invocaciones
 * seguidas en una misma Lambda tibia no vuelven a pegarle a la API.
 * @return {Promise<Object>} Opciones de conexion para mysql2.
 */
const credencialesDelSecreto = async () => {
  const secret = await getSecret(process.env.DATABASE_CONNECTION_SECRET, {
    transform: 'json',
    maxAge: 300
  });

  const { host, user, password, port, database } = secret.connectionDetails;

  return { host, user, password, port: Number(port), database };
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
