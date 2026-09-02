import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { actualizarCliente } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

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
        'sp_clientes_actualizar',
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
