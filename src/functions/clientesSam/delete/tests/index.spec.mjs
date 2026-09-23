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
import { eliminarCliente, handler, validarClienteId } from '../index.mjs';

const evento = (clienteId) => ({ pathParameters: { clienteId } });

describe('validarClienteId', () => {
  it.each(['1', '42', '2147483647'])('acepta "%s"', (valor) => {
    expect(validarClienteId(valor)).toBe(Number(valor));
  });

  it.each(['0', '-1', '1.5', 'abc', '', undefined])('rechaza "%s"', (valor) => {
    expect(validarClienteId(valor)).toBeNull();
  });
});

describe('eliminarCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve cuantas filas borro el procedimiento', async () => {
    callProcedure.mockResolvedValue([{ eliminados: 1 }]);

    expect(await eliminarCliente(1)).toBe(1);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientesSam_eliminar', [1]);
  });

  it('devuelve 0 cuando el procedimiento no regresa filas', async () => {
    callProcedure.mockResolvedValue([]);

    expect(await eliminarCliente(999)).toBe(0);
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('responde 204 sin cuerpo cuando borra', async () => {
    callProcedure.mockResolvedValue([{ eliminados: 1 }]);

    const respuesta = await handler(evento('1'));

    expect(respuesta.statusCode).toBe(204);
    expect(respuesta.body).toBeUndefined();
  });

  it('responde 400 cuando el id no es numerico y no toca la base de datos', async () => {
    const respuesta = await handler(evento('-5'));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body).errores[0].campo).toBe('clienteId');
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 404 cuando no habia nada que borrar', async () => {
    callProcedure.mockResolvedValue([{ eliminados: 0 }]);

    const respuesta = await handler(evento('999'));

    expect(respuesta.statusCode).toBe(404);
  });

  it('responde 500 cuando falla la base de datos', async () => {
    callProcedure.mockRejectedValue(new Error('DB caida'));

    const respuesta = await handler(evento('1'));

    expect(respuesta.statusCode).toBe(500);
  });
});
