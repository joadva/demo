import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/index.mjs', () => ({
  callProcedure: vi.fn()
}));

import { callProcedure } from '../../../../shared/database/index.mjs';
import { crearCliente } from '../index.mjs';

const fila = {
  clienteId: 1,
  nombre: 'Ana Ruiz',
  email: 'ana@demo.mx',
  telefono: '5551234567',
  creadoEn: '2026-09-01T00:00:00.000Z'
};

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
        'sp_clientes_crear',
        ['Ana Ruiz', 'ana@demo.mx', '5551234567']
    );
  });

  it('manda telefono en null cuando no viene en el cuerpo', async () => {
    callProcedure.mockResolvedValue([fila]);

    await crearCliente({ nombre: 'Ana Ruiz', email: 'ana@demo.mx' });

    expect(callProcedure).toHaveBeenCalledWith(
        'sp_clientes_crear',
        ['Ana Ruiz', 'ana@demo.mx', null]
    );
  });
});
