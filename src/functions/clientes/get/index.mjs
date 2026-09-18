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

    const cliente = await obtenerCliente(clienteId);

    if (!cliente) {
      return getResponse(404, { message: 'Cliente no encontrado' });
    }

    return getResponse(200, cliente);
  } catch (err) {
    logger.error('Error al obtener el cliente', err);
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
 * Returns a single cliente.
 * @param {number} clienteId - Identifier of the cliente.
 * @return {Promise<Object|null>} The cliente, or null when it does not exist.
 */
export const obtenerCliente = async (clienteId) => {
  const [cliente] = await callProcedure('sp_clientes_obtener', [clienteId]);
  return cliente ?? null;
};
