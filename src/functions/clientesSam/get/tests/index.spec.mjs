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
import { handler, obtenerCliente, validarClienteId } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

const evento = (clienteId) => ({ pathParameters: { clienteId } });

describe('validarClienteId', () => {
  it.each(['1', '42', '2147483647'])('acepta "%s"', (valor) => {
    expect(validarClienteId(valor)).toBe(Number(valor));
  });

  it.each(['0', '-1', '1.5', 'abc', '', undefined])('rechaza "%s"', (valor) => {
    expect(validarClienteId(valor)).toBeNull();
  });
});

describe('obtenerCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve el cliente cuando existe', async () => {
    callProcedure.mockResolvedValue([fila]);

    const resultado = await obtenerCliente(1);

    expect(resultado).toEqual(fila);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientesSam_obtener', [1]);
  });

  it('devuelve null cuando el procedimiento no regresa filas', async () => {
    callProcedure.mockResolvedValue([]);

    expect(await obtenerCliente(999)).toBeNull();
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('responde 200 con el cliente', async () => {
    callProcedure.mockResolvedValue([fila]);

    const respuesta = await handler(evento('1'));

    expect(respuesta.statusCode).toBe(200);
    expect(JSON.parse(respuesta.body)).toEqual(fila);
  });

  it('responde 400 cuando el id no es numerico y no toca la base de datos', async () => {
    const respuesta = await handler(evento('abc'));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body)).toEqual({
      message: 'Datos invalidos',
      errores: [{ campo: 'clienteId', mensaje: 'Debe ser un entero positivo' }]
    });
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el cliente no existe', async () => {
    callProcedure.mockResolvedValue([]);

    const respuesta = await handler(evento('999'));

    expect(respuesta.statusCode).toBe(404);
    expect(JSON.parse(respuesta.body)).toEqual({ message: 'Cliente no encontrado' });
  });

  it('responde 500 cuando falla la base de datos', async () => {
    callProcedure.mockRejectedValue(new Error('DB caida'));

    const respuesta = await handler(evento('1'));

    expect(respuesta.statusCode).toBe(500);
  });
});
