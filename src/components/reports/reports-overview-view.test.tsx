import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportsOverviewView } from './reports-overview-view';

describe('ReportsOverviewView', () => {
  it('renders backend overview fields including loss reasons', () => {
    render(
      <ReportsOverviewView
        data={{
          leads: {
            total: 10,
            qualified: 4,
            converted: 2,
            lost: 3,
            lossReasons: { PRICE: 2, OTHER: 1 },
          },
          deals: {
            active: 5,
            won: 2,
            lost: 1,
            operationallyCompleted: 1,
            lossReasons: { NO_STOCK: 1 },
          },
          quotes: { created: 8, approved: 3, clientAccepted: 2 },
          warehouse: { onHand: 40, available: 12 },
        }}
      />,
    );

    expect(screen.getByText('Лиды')).toBeInTheDocument();
    expect(screen.getByText('Коммерчески выиграны')).toBeInTheDocument();
    expect(screen.getByText('Операционно завершены')).toBeInTheDocument();
    expect(screen.getByText('Цена')).toBeInTheDocument();
    expect(screen.getByText('Нет в наличии')).toBeInTheDocument();
  });
});
