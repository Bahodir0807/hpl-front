export function isCommerciallyWon(deal: { stage: string }): boolean {
  return deal.stage === 'WON';
}

export function isOperationallyCompleted(deal: {
  completedAt?: string | null;
}): boolean {
  return Boolean(deal.completedAt);
}

export function isActiveOperationalDeal(deal: {
  stage: string;
  completedAt?: string | null;
}): boolean {
  return deal.stage !== 'LOST' && !deal.completedAt;
}
