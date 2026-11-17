import { describe, expect, it } from 'vitest';
import { statementsFromEntries } from './earnings';

const sale = (amountPaisa: number, date: string) => ({ amountPaisa, type: 'sale' as const, createdAt: new Date(date) });
const refund = (amountPaisa: number, date: string) => ({ amountPaisa: -amountPaisa, type: 'refund' as const, createdAt: new Date(date) });

describe('statementsFromEntries', () => {
  it('groups sales and refunds into months, newest first', () => {
    const rows = statementsFromEntries([
      sale(96000, '2026-10-02T10:00:00Z'),
      sale(96000, '2026-11-01T10:00:00Z'),
      refund(24000, '2026-11-03T10:00:00Z'),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['2026-11', '2026-10']);
    expect(rows[0]).toMatchObject({ salesPaisa: 96000, refundsPaisa: 24000, netPaisa: 72000, sales: 1, refunds: 1 });
    expect(rows[1]).toMatchObject({ salesPaisa: 96000, refundsPaisa: 0, netPaisa: 96000 });
  });

  it('returns no statements when nothing sold', () => {
    expect(statementsFromEntries([])).toEqual([]);
  });
});
