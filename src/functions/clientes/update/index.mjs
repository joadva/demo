import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    // API Gateway solo comprueba que el parametro de ruta exista, no que sea
    // un numero: eso se valida aqui. El cuerpo si llega ya validado contra el
    // schema de openapi.yaml; aqui solo van las reglas que el schema no alcanza.
    const clienteId = validarClienteId(event.pathParameters?.clienteId);
    if (clienteId === null) {
      return getResponse(400, {
        message: 'Datos invalidos',
        errores: [{ campo: 'clienteId', mensaje: 'Debe ser un entero positivo' }]
      });
    }

    const datos = normalizarCliente(JSON.parse(event.body));

    const errores = validarCliente(datos);
    if (errores.length) {
      return getResponse(400, { message: 'Datos invalidos', errores });
    }

    const cliente = await actualizarCliente(clienteId, datos);

    if (!cliente) {
      return getResponse(404, { message: 'Cliente no encontrado' });
    }

    return getResponse(200, cliente);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return getResponse(409, { message: 'Ya existe otro cliente con ese correo' });
    }

    logger.error('Error al actualizar el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

// API Gateway ignora `format: email`, por eso el formato se valida aqui.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
 * Limpia los datos antes de validarlos y guardarlos: sin espacios alrededor y
 * con el correo en minusculas.
 * @param {Object} datos - Cuerpo recibido.
 * @return {Object} Los mismos campos, normalizados.
 */
export const normalizarCliente = ({ nombre, email, telefono = null }) => ({
  nombre: (nombre ?? '').trim(),
  email: (email ?? '').trim().toLowerCase(),
  telefono: telefono?.trim() || null
});

/**
 * Reglas de negocio. Devuelve una lista vacia cuando todo esta bien.
 * @param {Object} datos - Cliente ya normalizado.
 * @return {Array<{campo: string, mensaje: string}>} Errores encontrados.
 */
export const validarCliente = ({ nombre, email }) => {
  const errores = [];

  if (nombre.length < 2) {
    errores.push({ campo: 'nombre', mensaje: 'El nombre debe tener al menos 2 caracteres' });
  }

  if (!EMAIL.test(email)) {
    errores.push({ campo: 'email', mensaje: 'El correo no tiene un formato valido' });
  }

  return errores;
};

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
