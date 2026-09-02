import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { obtenerCliente } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

describe('obtenerCliente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve el cliente cuando existe', async () => {
    callProcedure.mockResolvedValue([fila]);

    const resultado = await obtenerCliente(1);

    expect(resultado).toEqual(fila);
    expect(callProcedure).toHaveBeenCalledWith('sp_clientes_obtener', [1]);
  });

  it('devuelve null cuando el procedimiento no regresa filas', async () => {
    callProcedure.mockResolvedValue([]);

    expect(await obtenerCliente(999)).toBeNull();
  });
});
