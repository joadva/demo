import { getResponse } from '../../shared/apigateway/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async () => {
  try {
    return getResponse(200, buildPong());
  } catch (err) {
    logger.error('Error en ping', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Builds the ping payload. No external dependencies, so this endpoint answers
 * 200 aunque no haya base de datos ni servicios de terceros configurados.
 * @return {Object} Payload with a fixed message and the current timestamp.
 */
export const buildPong = () => ({
  message: 'pong',
  timestamp: new Date().toISOString()
});
