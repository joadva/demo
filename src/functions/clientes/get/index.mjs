import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    const cliente = await obtenerCliente(Number(event.pathParameters.clienteId));

    if (!cliente) {
      return getResponse(404, { message: 'Cliente not found' });
    }

    return getResponse(200, cliente);
  } catch (err) {
    logger.error('Error al obtener el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Returns a single cliente.
 * @param {number} clienteId - Identifier of the cliente.
 * @return {Promise<Object|null>} The cliente, or null when it does not exist.
 */
export const obtenerCliente = async (clienteId) => {
  const [cliente] = await callProcedure('sp_clientes_obtener', [clienteId]);
  return cliente ?? null;
};
