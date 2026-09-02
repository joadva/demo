import { describe, expect, it } from 'vitest';
import { buildEcho } from '../index.mjs';

describe('buildEcho', () => {
  it('devuelve el cuerpo recibido', () => {
    const event = { body: JSON.stringify({ mensaje: 'hola' }) };

    expect(buildEcho(event).payload).toEqual({ mensaje: 'hola' });
  });

  it('devuelve un objeto vacio cuando no hay cuerpo', () => {
    expect(buildEcho({}).payload).toEqual({});
  });

  it('incluye un timestamp ISO valido', () => {
    const { receivedAt } = buildEcho({});
    expect(Number.isNaN(Date.parse(receivedAt))).toBe(false);
  });
});
