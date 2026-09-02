import { getResponse } from '../../shared/apigateway/index.mjs';
import { createConnection } from '../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async () => {
  try {
    const dbStatus = await checkDatabaseConnection();

    return getResponse(200, {
      database: dbStatus
    });
  } catch (err) {
    logger.error(err, err.stack);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

export const checkDatabaseConnection = async () => {
  try {
    const connection = await createConnection();
    // Execute a simple query to validate the connection
    await connection.query('SELECT 1');
    await connection.end();
    return { success: true, message: 'Conexión exitosa a la base de datos' };
  } catch (err) {
    logger.error('Error al conectar a la base de datos', err);
    return { success: false, message: err.message };
  }
};
