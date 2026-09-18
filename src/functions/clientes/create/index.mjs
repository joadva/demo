import { getResponse } from '../../../shared/apigateway/index.mjs';
import { callProcedure } from '../../../shared/database/index.mjs';
import { initializePowertools, logger } from '../../../shared/lambda-powertools/index.mjs';

export const handler = initializePowertools(async (event) => {
  try {
    // La forma del cuerpo (campos requeridos, tipos, longitudes, patron del
    // telefono) ya la reviso el request validator de API Gateway declarado en
    // openapi.yaml; aqui solo se aplican las reglas que el schema no alcanza.
    const datos = normalizarCliente(JSON.parse(event.body));

    const errores = validarCliente(datos);
    if (errores.length) {
      return getResponse(400, { message: 'Datos invalidos', errores });
    }

    const cliente = await crearCliente(datos);

    return getResponse(201, cliente);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return getResponse(409, { message: 'Ya existe un cliente con ese correo' });
    }

    logger.error('Error al crear el cliente', err);
    return getResponse(500, { message: 'Something went wrong!' });
  }
});

// API Gateway ignora `format: email`, por eso el formato se valida aqui.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Limpia los datos antes de validarlos y guardarlos: sin espacios alrededor y
 * con el correo en minusculas, para que 'Ana@Demo.mx' y 'ana@demo.mx' sean el
 * mismo cliente ante la restriccion UNIQUE de la tabla.
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
 * Creates a cliente.
 * @param {Object} datos - Fields of the cliente to create.
 * @return {Promise<Object|null>} The created cliente.
 */
export const crearCliente = async ({ nombre, email, telefono = null }) => {
  const [cliente] = await callProcedure('sp_clientes_crear', [nombre, email, telefono]);
  return cliente ?? null;
};
