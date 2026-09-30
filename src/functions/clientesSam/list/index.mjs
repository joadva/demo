import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    // API Gateway no revisa el tipo ni el rango de los parametros de query,
    // solo su presencia cuando son requeridos: eso se valida aqui.
    const { limite, offset, errores } = validarPaginacion(event.queryStringParameters ?? {});
    if (errores.length) {
      return getResponse(400, { message: 'Datos invalidos', errores });
    }

    const clientes = await listarClientes(limite, offset);

    return getResponse(200, { clientes });
  } catch (err) {
    logger.error('Error al listar clientes', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

export const LIMITE_MAXIMO = 200;

/**
 * Interpreta los parametros de paginacion y valida sus rangos. Los valores
 * por omision coinciden con los declarados en openapi.yaml.
 * @param {Object} query - Parametros de la query string, todos como texto.
 * @return {{limite: number, offset: number, errores: Array}} Valores ya
 * convertidos y la lista de errores encontrados, vacia si todo esta bien.
 */
export const validarPaginacion = ({ limite = '50', offset = '0' }) => {
  const errores = [];
  const limiteNumero = Number(limite);
  const offsetNumero = Number(offset);

  if (!Number.isInteger(limiteNumero) || limiteNumero < 1 || limiteNumero > LIMITE_MAXIMO) {
    errores.push({ campo: 'limite', mensaje: `Debe ser un entero entre 1 y ${LIMITE_MAXIMO}` });
  }

  if (!Number.isInteger(offsetNumero) || offsetNumero < 0) {
    errores.push({ campo: 'offset', mensaje: 'Debe ser un entero mayor o igual a 0' });
  }

  return { limite: limiteNumero, offset: offsetNumero, errores };
};

/**
 * Returns a page of clientes.
 * @param {number} limite - Maximum number of rows to return.
 * @param {number} offset - Number of rows to skip.
 * @return {Promise<Array>} Rows returned by sp_clientesSam_listar.
 */
export const listarClientes = async (limite, offset) => {
  return callProcedure('sp_clientesSam_listar', [limite, offset]);
};
