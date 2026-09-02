import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    const clienteId = Number(event.pathParameters.clienteId);

    const cliente = await actualizarCliente(clienteId, JSON.parse(event.body));

    if (!cliente) {
      return getResponse(404, { message: 'Cliente not found' });
    }

    return getResponse(200, cliente);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return getResponse(409, { message: 'Cliente already exists' });
    }

    logger.error('Error al actualizar el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Updates the editable fields of a cliente.
 * @param {number} clienteId - Identifier of the cliente.
 * @param {Object} datos - New values for the cliente.
 * @return {Promise<Object|null>} The updated cliente, or null when it does not exist.
 */
export const actualizarCliente = async (clienteId, { nombre, email, telefono = null }) => {
  const [cliente] = await callProcedure('sp_clientes_actualizar', [clienteId, nombre, email, telefono]);
  return cliente ?? null;
};
