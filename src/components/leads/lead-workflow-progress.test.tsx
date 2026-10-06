import { describe, expect, it } from 'vitest';
import { resolveLeadWorkflowStage } from './lead-workflow-progress';

describe('resolveLeadWorkflowStage', () => {
  it('starts at intake for a fresh lead', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'NEW',
        hasQualification: false,
        hasManagerNote: false,
        hasCalculationRequest: false,
        hasQuote: false,
        hasDeal: false,
      }),
    ).toBe('intake');
  });

  it('advances to qualification when qualified', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'QUALIFIED',
        hasQualification: true,
        hasManagerNote: false,
        hasCalculationRequest: false,
        hasQuote: false,
        hasDeal: false,
      }),
    ).toBe('qualification');
  });

  it('advances to manager note when note exists', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'QUALIFIED',
        hasQualification: true,
        hasManagerNote: true,
        hasCalculationRequest: false,
        hasQuote: false,
        hasDeal: false,
      }),
    ).toBe('managerNote');
  });

  it('advances to calculation when request exists', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'QUALIFIED',
        hasQualification: true,
        hasManagerNote: true,
        hasCalculationRequest: true,
        hasQuote: false,
        hasDeal: false,
      }),
    ).toBe('calculation');
  });

  it('advances to quote when quote exists', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'QUALIFIED',
        hasQualification: true,
        hasManagerNote: true,
        hasCalculationRequest: true,
        hasQuote: true,
        hasDeal: false,
      }),
    ).toBe('quote');
  });

  it('advances to deal when converted', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'CONVERTED',
        hasQualification: true,
        hasManagerNote: true,
        hasCalculationRequest: true,
        hasQuote: true,
        hasDeal: true,
      }),
    ).toBe('deal');
  });

  it('stays at intake for lost lead', () => {
    expect(
      resolveLeadWorkflowStage({
        status: 'LOST',
        hasQualification: true,
        hasManagerNote: true,
        hasCalculationRequest: true,
        hasQuote: true,
        hasDeal: false,
      }),
    ).toBe('intake');
  });
});
