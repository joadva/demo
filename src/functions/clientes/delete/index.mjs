import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    // API Gateway solo comprueba que el parametro de ruta exista, no que sea
    // un numero: eso se valida aqui.
    const clienteId = validarClienteId(event.pathParameters?.clienteId);
    if (clienteId === null) {
      return getResponse(400, {
        message: 'Datos invalidos',
        errores: [{ campo: 'clienteId', mensaje: 'Debe ser un entero positivo' }]
      });
    }

    const eliminados = await eliminarCliente(clienteId);

    if (eliminados === 0) {
      return getResponse(404, { message: 'Cliente no encontrado' });
    }

    return getResponse(204);
  } catch (err) {
    logger.error('Error al eliminar el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Convierte el parametro de ruta en un entero positivo.
 * @param {string|undefined} valor - Lo que llego en la URL.
 * @return {number|null} El identificador, o null si no es valido.
 */
export const validarClienteId = (valor) => {
  const clienteId = Number(valor);
  return Number.isInteger(clienteId) && clienteId > 0 ? clienteId : null;
};

/**
 * Deletes a cliente.
 * @param {number} clienteId - Identifier of the cliente.
 * @return {Promise<number>} How many rows were deleted: 1 or 0.
 */
export const eliminarCliente = async (clienteId) => {
  const [resultado] = await callProcedure('sp_clientes_eliminar', [clienteId]);
  return resultado?.eliminados ?? 0;
};
