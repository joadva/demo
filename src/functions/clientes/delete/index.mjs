import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    const clienteId = Number(event.pathParameters.clienteId);

    const eliminados = await eliminarCliente(clienteId);

    if (eliminados === 0) {
      return getResponse(404, { message: 'Cliente not found' });
    }

    return getResponse(204);
  } catch (err) {
    logger.error('Error al eliminar el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Deletes a cliente.
 * @param {number} clienteId - Identifier of the cliente.
 * @return {Promise<number>} How many rows were deleted: 1 or 0.
 */
export const eliminarCliente = async (clienteId) => {
  const [resultado] = await callProcedure('sp_clientes_eliminar', [clienteId]);
  return resultado?.eliminados ?? 0;
};
