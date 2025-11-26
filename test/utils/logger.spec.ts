import { describe, expect, it, vi } from 'vitest';
import { logWithContext } from '../../src/utils/logger';

describe('logWithContext', () => {
  it('logs structured payloads with requestId and metadata', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logWithContext('info', 'test.event', {
      requestId: 'req-123',
      meta: { foo: 'bar' },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0]);
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('test.event');
    expect(payload.requestId).toBe('req-123');
    expect(payload.meta).toEqual({ foo: 'bar' });

    spy.mockRestore();
  });
});

