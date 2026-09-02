import { getResponse } from '../../shared/apigateway/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    return getResponse(200, buildEcho(event));
  } catch (err) {
    logger.error('Error en echo', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Devuelve el cuerpo recibido. El request validator de API Gateway ya rechazo
 * cualquier JSON invalido antes de llegar aqui, asi que el parseo es seguro.
 * @param {Object} event - API Gateway proxy event.
 * @return {Object} Payload with the received body and when it arrived.
 */
export const buildEcho = (event) => ({
  receivedAt: new Date().toISOString(),
  payload: event.body ? JSON.parse(event.body) : {}
});
