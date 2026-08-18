import { describe, expect, it, vi } from 'vitest';
import { finalizeCalculationBeforeQuote } from './calculation-quote';

describe('finalizeCalculationBeforeQuote', () => {
  it('finalizes a draft before converting it to a Quote', async () => {
    const calls: string[] = [];
    const finalize = vi.fn(async () => {
      calls.push('finalize');
      return { status: 'finalized' };
    });
    const convert = vi.fn(async () => {
      calls.push('convert');
    });

    await finalizeCalculationBeforeQuote({
      calculationId: 'calculation-1',
      isFinalized: false,
      finalize,
      convert,
    });

    expect(calls).toEqual(['finalize', 'convert']);
    expect(finalize).toHaveBeenCalledWith('calculation-1');
    expect(convert).toHaveBeenCalledWith('calculation-1');
  });

  it('does not convert when finalization fails', async () => {
    const finalize = vi.fn().mockRejectedValue(new Error('finalize failed'));
    const convert = vi.fn();

    await expect(
      finalizeCalculationBeforeQuote({
        calculationId: 'calculation-1',
        isFinalized: false,
        finalize,
        convert,
      }),
    ).rejects.toThrow('finalize failed');

    expect(convert).not.toHaveBeenCalled();
  });

  it('skips redundant finalization for an already-finalized calculation', async () => {
    const finalize = vi.fn();
    const convert = vi.fn().mockResolvedValue(undefined);

    await finalizeCalculationBeforeQuote({
      calculationId: 'calculation-1',
      isFinalized: true,
      finalize,
      convert,
    });

    expect(finalize).not.toHaveBeenCalled();
    expect(convert).toHaveBeenCalledWith('calculation-1');
  });
});
