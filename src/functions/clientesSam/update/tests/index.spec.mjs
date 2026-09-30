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
import { actualizarCliente, handler, validarCliente, validarClienteId } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

const evento = (clienteId, body) => ({
  pathParameters: { clienteId },
  body: JSON.stringify(body)
});

describe('validarClienteId', () => {
  it.each(['1', '42', '2147483647'])('acepta "%s"', (valor) => {
    expect(validarClienteId(valor)).toBe(Number(valor));
  });

  it.each(['0', '-1', '1.5', 'abc', '', undefined])('rechaza "%s"', (valor) => {
    expect(validarClienteId(valor)).toBeNull();
  });
});

describe('validarCliente', () => {
  it('no devuelve errores con datos correctos', () => {
    expect(validarCliente({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' })).toEqual([]);
  });

  it('rechaza nombre corto y correo mal formado', () => {
    expect(validarCliente({ nombre: 'A', email: 'ana@' })).toEqual([
      { campo: 'nombre', mensaje: 'El nombre debe tener al menos 2 caracteres' },
      { campo: 'email', mensaje: 'El correo no tiene un formato valido' }
    ]);
  });
});

describe('actualizarCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('antepone el id a los campos editables', async () => {
    callProcedure.mockResolvedValue([fila]);

    const resultado = await actualizarCliente(1, {
      nombre: 'Ana Ruiz',
      email: 'ana@demo.mx',
      telefono: '5551234567'
    });

    expect(resultado).toEqual(fila);
    expect(callProcedure).toHaveBeenCalledWith(
        'sp_clientesSam_actualizar',
        [1, 'Ana Ruiz', 'ana@demo.mx', '5551234567']
    );
  });

  it('devuelve null cuando el cliente no existe', async () => {
    callProcedure.mockResolvedValue([]);

    const resultado = await actualizarCliente(999, {
      nombre: 'Ana Ruiz',
      email: 'ana@demo.mx'
    });

    expect(resultado).toBeNull();
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('responde 200 con el cliente actualizado', async () => {
    callProcedure.mockResolvedValue([fila]);

    const respuesta = await handler(evento('1', { nombre: 'Ana Ruiz', email: 'ANA@demo.mx' }));

    expect(respuesta.statusCode).toBe(200);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientesSam_actualizar', [1, 'Ana Ruiz', 'ana@demo.mx', null]);
  });

  it('responde 400 cuando el id de la ruta no es numerico', async () => {
    const respuesta = await handler(evento('abc', { nombre: 'Ana Ruiz', email: 'ana@demo.mx' }));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body).errores).toEqual([
      { campo: 'clienteId', mensaje: 'Debe ser un entero positivo' }
    ]);
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 400 cuando el cuerpo rompe una regla de negocio', async () => {
    const respuesta = await handler(evento('1', { nombre: 'Ana Ruiz', email: 'sin-arroba' }));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body).errores[0].campo).toBe('email');
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el cliente no existe', async () => {
    callProcedure.mockResolvedValue([]);

    const respuesta = await handler(evento('999', { nombre: 'Ana Ruiz', email: 'ana@demo.mx' }));

    expect(respuesta.statusCode).toBe(404);
  });

  it('responde 409 cuando el correo ya es de otro cliente', async () => {
    callProcedure.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));

    const respuesta = await handler(evento('1', { nombre: 'Ana Ruiz', email: 'ana@demo.mx' }));

    expect(respuesta.statusCode).toBe(409);
  });
});
