import mysql from 'mysql2/promise';
import { logger } from '../lambda-powertools/index.mjs';

// Version con Secrets Manager, desactivada porque el secreto cobra ~0.40 USD
// al mes solo por existir. Descomentar este import junto con la funcion
// createConnection de mas abajo, y seguir los 4 pasos de la nota del recurso
// DatabaseConnectionSecret en template.yaml.
//
// import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

/**
 * Creates a connection to the MySQL database using the credentials that
 * template.yaml passes as environment variables.
 * @return {Promise<mysql.Connection>} MySQL database connection.
 */
const createConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE
  });
};

// Alternativa con Secrets Manager. Reemplaza a la createConnection de arriba.
//
// El secreto guarda un JSON con esta forma, generado por template.yaml:
//   { "connectionDetails": {
//       "host": "...", "user": "...", "password": "...",
//       "port": "3306", "database": "..." } }
//
// getSecret() trae el valor y lo cachea 5 segundos por omision, asi que
// invocaciones seguidas en una misma Lambda tibia no vuelven a pegarle a la
// API de Secrets Manager. El segundo argumento controla ese cache:
//   getSecret(nombre, { transform: 'json', maxAge: 300 })
//
// La funcion necesita la variable de entorno DATABASE_CONNECTION_SECRET y el
// permiso secretsmanager:GetSecretValue sobre el secreto; ambos estan en la
// nota de template.yaml.
//
// /**
//  * Creates a connection to the MySQL database using credentials from AWS Secrets Manager.
//  * @return {Promise<mysql.Connection>} MySQL database connection.
//  */
// const createConnection = async () => {
//   const secret = await getSecret(process.env.DATABASE_CONNECTION_SECRET, { transform: 'json' });
//   const { host, user, password, port, database } = secret.connectionDetails;
//
//   return mysql.createConnection({
//     host,
//     user,
//     password,
//     port: Number(port),
//     database
//   });
// };

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
