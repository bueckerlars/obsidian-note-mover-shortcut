import { describe, expect, it, vi } from 'vitest';
import { applyPeriodicInterval } from './intervalInput';

describe('applyPeriodicInterval', () => {
  it.each(['abc', '0', '-5', '1.5', '1000000'])('rejects %s', raw => {
    const startTimer = vi.fn();
    const error = applyPeriodicInterval({ raw, current: 5, startTimer });
    expect(error).toBeTruthy();
    expect(startTimer).not.toHaveBeenCalled();
  });

  it('starts the timer once for a valid new value', () => {
    const startTimer = vi.fn();
    expect(
      applyPeriodicInterval({ raw: '10', current: 5, startTimer })
    ).toBeNull();
    expect(
      applyPeriodicInterval({ raw: '10', current: 10, startTimer })
    ).toBeNull();
    expect(startTimer).toHaveBeenCalledTimes(1);
    expect(startTimer).toHaveBeenCalledWith(10);
  });
});
