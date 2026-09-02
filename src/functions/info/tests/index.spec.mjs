import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInfo } from '../index.mjs';

describe('buildInfo', () => {
  const entornoOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.SERVICE_NAME;
    delete process.env.SERVICE_VERSION;
    delete process.env.AWS_REGION;
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it('usa valores por omision cuando no hay variables de entorno', () => {
    expect(buildInfo()).toMatchObject({
      service: 'demo-api',
      version: '1.0.0',
      region: 'unknown'
    });
  });

  it('toma los valores del entorno cuando existen', () => {
    process.env.SERVICE_NAME = 'demo-api';
    process.env.SERVICE_VERSION = '2.3.4';
    process.env.AWS_REGION = 'us-east-1';

    expect(buildInfo()).toMatchObject({
      service: 'demo-api',
      version: '2.3.4',
      region: 'us-east-1'
    });
  });
});
