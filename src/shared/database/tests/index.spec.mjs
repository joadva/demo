import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-lambda-powertools/parameters/secrets', () => ({
  getSecret: vi.fn()
}));

vi.mock('../../lambda-powertools/index.mjs', () => ({
  logger: { info: vi.fn(), error: vi.fn() }
}));

import { leerCredenciales } from '../index.mjs';

const esperado = {
  host: 'db.demo.mx',
  user: 'demo',
  password: 'secreta',
  port: 3306,
  database: 'demo'
};

describe('leerCredenciales', () => {
  afterEach(() => {
    delete process.env.DB_DATABASE;
  });

  it('acepta el secreto envuelto en connectionDetails', () => {
    expect(leerCredenciales({
      connectionDetails: { host: 'db.demo.mx', user: 'demo', password: 'secreta', port: '3306', database: 'demo' }
    })).toEqual(esperado);
  });

  it('acepta el secreto con los campos planos', () => {
    expect(leerCredenciales({
      host: 'db.demo.mx', user: 'demo', password: 'secreta', port: '3306', database: 'demo'
    })).toEqual(esperado);
  });

  it('acepta el formato que genera RDS: username y dbname', () => {
    expect(leerCredenciales({
      host: 'db.demo.mx', username: 'demo', password: 'secreta', port: 3306, dbname: 'demo'
    })).toEqual(esperado);
  });

  it('usa 3306 cuando el secreto no trae puerto', () => {
    expect(leerCredenciales({ host: 'db.demo.mx', user: 'demo', password: 'secreta', database: 'demo' }).port).toBe(3306);
  });

  it('toma la base de DB_DATABASE cuando el secreto no la trae', () => {
    process.env.DB_DATABASE = 'demo';

    expect(leerCredenciales({ host: 'db.demo.mx', username: 'demo', password: 'secreta' })).toEqual(esperado);
  });

  it('dice que campos faltan y que claves llegaron', () => {
    expect(() => leerCredenciales({ host: 'db.demo.mx', usuario: 'demo' }))
        .toThrow('El secreto no trae user, password, database. Claves recibidas: host, usuario.');
  });

  it('avisa cuando el secreto llega vacio', () => {
    expect(() => leerCredenciales(null)).toThrow('Claves recibidas: (ninguna)');
  });
});
