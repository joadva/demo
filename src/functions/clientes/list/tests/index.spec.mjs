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
import { LIMITE_MAXIMO, handler, listarClientes, validarPaginacion } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

const evento = (queryStringParameters) => ({ queryStringParameters });

describe('validarPaginacion', () => {
  it('usa 50 y 0 cuando no llega nada', () => {
    expect(validarPaginacion({})).toEqual({ limite: 50, offset: 0, errores: [] });
  });

  it('convierte los valores de texto a numero', () => {
    expect(validarPaginacion({ limite: '10', offset: '20' })).toEqual({ limite: 10, offset: 20, errores: [] });
  });

  it.each(['0', '-1', '2.5', 'abc', String(LIMITE_MAXIMO + 1)])('rechaza limite "%s"', (limite) => {
    const { errores } = validarPaginacion({ limite });
    expect(errores).toEqual([{ campo: 'limite', mensaje: `Debe ser un entero entre 1 y ${LIMITE_MAXIMO}` }]);
  });

  it.each(['-1', '1.5', 'abc'])('rechaza offset "%s"', (offset) => {
    const { errores } = validarPaginacion({ offset });
    expect(errores).toEqual([{ campo: 'offset', mensaje: 'Debe ser un entero mayor o igual a 0' }]);
  });

  it('acumula los errores de ambos parametros', () => {
    expect(validarPaginacion({ limite: 'x', offset: 'y' }).errores).toHaveLength(2);
  });
});

describe('listarClientes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('llama al procedimiento con limite y offset', async () => {
    callProcedure.mockResolvedValue([fila]);

    const resultado = await listarClientes(50, 0);

    expect(resultado).toEqual([fila]);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientes_listar', [50, 0]);
  });

  it('devuelve un arreglo vacio cuando no hay clientes', async () => {
    callProcedure.mockResolvedValue([]);

    expect(await listarClientes(50, 0)).toEqual([]);
  });

  it('propaga el error del procedimiento', async () => {
    callProcedure.mockRejectedValue(new Error('DB caida'));

    await expect(listarClientes(50, 0)).rejects.toThrow('DB caida');
  });
});

describe('handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('responde 200 con la pagina pedida', async () => {
    callProcedure.mockResolvedValue([fila]);

    const respuesta = await handler(evento({ limite: '10', offset: '20' }));

    expect(respuesta.statusCode).toBe(200);
    expect(JSON.parse(respuesta.body)).toEqual({ clientes: [fila] });
    expect(callProcedure).toHaveBeenCalledWith('sp_clientes_listar', [10, 20]);
  });

  it('usa los valores por omision cuando no hay query string', async () => {
    callProcedure.mockResolvedValue([]);

    await handler({});

    expect(callProcedure).toHaveBeenCalledWith('sp_clientes_listar', [50, 0]);
  });

  it('responde 400 con un limite fuera de rango y no toca la base de datos', async () => {
    const respuesta = await handler(evento({ limite: '999' }));

    expect(respuesta.statusCode).toBe(400);
    expect(JSON.parse(respuesta.body).errores[0].campo).toBe('limite');
    expect(callProcedure).not.toHaveBeenCalled();
  });

  it('responde 500 cuando falla la base de datos', async () => {
    callProcedure.mockRejectedValue(new Error('DB caida'));

    const respuesta = await handler(evento({}));

    expect(respuesta.statusCode).toBe(500);
  });
});
