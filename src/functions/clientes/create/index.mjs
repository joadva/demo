import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    // El cuerpo ya viene validado contra el esquema por el request validator
    // de API Gateway declarado en openapi.yaml.
    const cliente = await crearCliente(JSON.parse(event.body));

    return getResponse(201, cliente);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return getResponse(409, { message: 'Cliente already exists' });
    }

    logger.error('Error al crear el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

/**
 * Creates a cliente.
 * @param {Object} datos - Fields of the cliente to create.
 * @return {Promise<Object|null>} The created cliente.
 */
export const crearCliente = async ({ nombre, email, telefono = null }) => {
  const [cliente] = await callProcedure('sp_clientes_crear', [nombre, email, telefono]);
  return cliente ?? null;
};
