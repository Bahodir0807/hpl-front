type FinalizeCalculationBeforeQuoteOptions<TFinalized> = {
  calculationId: string;
  isFinalized: boolean;
  finalize: (calculationId: string) => Promise<TFinalized>;
  convert: (calculationId: string) => Promise<unknown>;
  onFinalized?: (calculation: TFinalized) => void;
};

export async function finalizeCalculationBeforeQuote<TFinalized>({
  calculationId,
  isFinalized,
  finalize,
  convert,
  onFinalized,
}: FinalizeCalculationBeforeQuoteOptions<TFinalized>): Promise<void> {
  if (!isFinalized) {
    const finalized = await finalize(calculationId);
    onFinalized?.(finalized);
  }

  await convert(calculationId);
}
