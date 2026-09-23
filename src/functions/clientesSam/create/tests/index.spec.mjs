import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

// Sin el middleware de Powertools el handler se prueba como una funcion normal.
vi.mock('../../../../shared/lambda-powertools/index.mjs', () => ({
  initializePowertools: (fn) => fn,
  logger: { error: vi.fn() }
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { crearCliente, handler, normalizarCliente, validarCliente } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

const evento = (body) => ({ body: JSON.stringify(body) });

describe('normalizarCliente', () => {
  it('recorta espacios y pasa el correo a minusculas', () => {
    expect(normalizarCliente({ nombre: '  Ana Ruiz ', email: ' Ana@Demo.MX ' })).toEqual({
      nombre: 'Ana Ruiz',
      email: 'ana@demo.mx',
      telefono: null
    });
  });

  it('convierte un telefono vacio en null', () => {
    expect(normalizarCliente({ nombre: 'Ana', email: 'a@b.mx', telefono: '  ' }).telefono).toBeNull();
  });
});

describe('validarCliente', () => {
  it('no devuelve errores con datos correctos', () => {
    expect(validarCliente({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' })).toEqual([]);
  });

  it('rechaza un nombre de un solo caracter', () => {
    expect(validarCliente({ nombre: 'A', email: 'ana@demo.mx' })).toEqual([
      { campo: 'nombre', mensaje: 'El nombre debe tener al menos 2 caracteres' }
    ]);
  });

  it.each(['ana', 'ana@', '@demo.mx', 'ana@demo', 'ana demo@x.mx'])('rechaza el correo "%s"', (email) => {
    expect(validarCliente({ nombre: 'Ana Ruiz', email })).toEqual([
      { campo: 'email', mensaje: 'El correo no tiene un formato valido' }
    ]);
  });

  it('acumula todos los errores en una sola respuesta', () => {
    expect(validarCliente({ nombre: '', email: 'x' })).toHaveLength(2);
  });
});

describe('crearCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('manda los campos en el orden del procedimiento', async () => {
    callProcedure.mockResolvedValue([fila]);

    const resultado = await crearCliente({
      nombre: 'Ana Ruiz',
      email: 'ana@demo.mx',
      telefono: '5551234567'
    });

    expect(resultado).toEqual(fila);
    expect(callProcedure).toHaveBeenCalledWith(
        'sp_clientesSam_crear',
        ['Ana Ruiz', 'ana@demo.mx', '5551234567']
    );
  });

  it('manda telefono en null cuando no viene en el cuerpo', async () => {
    callProcedure.mockResolvedValue([fila]);

    await crearCliente({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' });

    expect(callProcedure).toHaveBeenCalledWith(
        'sp_clientesSam_crear',
        ['Ana Ruiz', 'ana@demo.mx', null]
    );
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('responde 201 con el cliente creado', async () => {
    callProcedure.mockResolvedValue([fila]);

    const respuesta = await handler(evento({ nombre: ' Ana Ruiz ', email: 'ANA@demo.mx', telefono: '5551234567' }));

    expect(respuesta.statusCode).toBe(201);
    expect(JSON.parse(respuesta.body)).toEqual(fila);
    // Llega al procedimiento ya normalizado.
    expect(callProcedure).toHaveBeenCalledWith('sp_clientesSam_crear', ['Ana Ruiz', 'ana@demo.mx', '5551234567']);
  });

  it('responde 400 con la lista de errores y no toca la base de datos', async () => {
    const respuesta = await handler(evento({ nombre: 'A', email: 'nope' }));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body)).toEqual({
      message: 'Datos invalidos',
      errores: [
        { campo: 'nombre', mensaje: 'El nombre debe tener al menos 2 caracteres' },
        { campo: 'email', mensaje: 'El correo no tiene un formato valido' }
      ]
    });
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 409 cuando el correo ya existe', async () => {
    callProcedure.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));

    const respuesta = await handler(evento({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' }));

    expect(respuesta.statusCode).toBe(409);
  });

  it('responde 500 ante cualquier otro error', async () => {
    callProcedure.mockRejectedValue(new Error('DB caida'));

    const respuesta = await handler(evento({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' }));

    expect(respuesta.statusCode).toBe(500);
    expect(JSON.parse(respuesta.body)).toEqual({ message: 'Something went wrong!' });
  });
});
