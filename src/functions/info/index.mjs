import { getResponse } from '../../shared/apigateway/index.mjs';
import { initializePowertools, logger } from '../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async () => {
  try {
    return getResponse(200, buildInfo());
  } catch (err) {
    logger.error('Error en info', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Builds the service metadata. Solo lee variables de entorno que Lambda
 * siempre define, o valores por omision, asi que nunca falla.
 * @return {Object} Service name, version, region and current timestamp.
 */
export const buildInfo = () => ({
  service: process.env.SERVICE_NAME || 'demo-api',
  version: process.env.SERVICE_VERSION || '1.0.0',
  region: process.env.AWS_REGION || 'unknown',
  timestamp: new Date().toISOString()
});
