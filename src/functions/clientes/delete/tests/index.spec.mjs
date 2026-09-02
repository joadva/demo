import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { eliminarCliente } from '../index.mjs';

describe('eliminarCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve cuantas filas se borraron', async () => {
    callProcedure.mockResolvedValue([{ eliminados: 1 }]);

    expect(await eliminarCliente(1)).toBe(1);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientes_eliminar', [1]);
  });

  it('devuelve 0 cuando el procedimiento no regresa filas', async () => {
    callProcedure.mockResolvedValue([]);

    expect(await eliminarCliente(999)).toBe(0);
  });
});
