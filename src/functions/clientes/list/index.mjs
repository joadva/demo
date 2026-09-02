import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    const { limite = '50', offset = '0' } = event.queryStringParameters ?? {};

    const clientes = await listarClientes(Number(limite), Number(offset));

    return getResponse(200, { clientes });
  } catch (err) {
    logger.error('Error al listar clientes', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Returns a page of clientes.
 * @param {number} limite - Maximum number of rows to return.
 * @param {number} offset - Number of rows to skip.
 * @return {Promise<Array>} Rows returned by sp_clientes_listar.
 */
export const listarClientes = async (limite, offset) => {
  return callProcedure('sp_clientes_listar', [limite, offset]);
};
