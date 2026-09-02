import { describe, expect, it } from 'vitest';
import { buildPong } from '../index.mjs';

describe('buildPong', () => {
  it('responde pong', () => {
    expect(buildPong().message).toBe('pong');
  });

  it('incluye un timestamp ISO valido', () => {
    const { timestamp } = buildPong();
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
  });
});
