import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { listarClientes } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

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
