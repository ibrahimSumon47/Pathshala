import { describe, expect, it } from 'vitest';
import { asciiSafe, buildInvoicePdf, invoiceNumberFor } from './invoice';

const invoice = {
  invoiceNumber: 'INV-RCPT20261117ABCDEF',
  orderNumber: 'PS-20261117-AB12CD34',
  paidAt: '2026-11-17T10:00:00.000Z',
  status: 'paid',
  studentName: 'Nusrat Jahan',
  studentEmail: 'student@pathshala.dev',
  items: [
    { title: 'Everyday Spoken English', pricePaisa: 120000 },
    { title: 'Excel for Office Work', pricePaisa: 150000 },
  ],
  subtotalPaisa: 270000,
  discountPaisa: 54000,
  totalPaisa: 216000,
  provider: 'paybridge',
  couponCode: 'EARLYBIRD',
};

describe('asciiSafe', () => {
  it('keeps Latin text and falls back when a title is only Bangla', () => {
    expect(asciiSafe('Excel for Office Work')).toBe('Excel for Office Work');
    expect(asciiSafe('অফিসের কাজে এক্সেল')).toBe('Course');
    expect(asciiSafe('', 'Course')).toBe('Course');
  });
});

describe('invoiceNumberFor', () => {
  it('uses the receipt when it exists and strips punctuation', () => {
    expect(invoiceNumberFor('RCPT-20261117-52EE67', 'PS-20261117-AB12CD34')).toBe('INV-RCPT2026111752EE67');
    expect(invoiceNumberFor(null, 'PS-20261117-AB12CD34')).toBe('INV-PS20261117AB12CD34');
  });
});

describe('buildInvoicePdf', () => {
  it('writes a single-page PDF with the order, both items and the test-mode note', () => {
    const pdf = buildInvoicePdf(invoice).toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('INV-RCPT20261117ABCDEF');
    expect(pdf).toContain('Everyday Spoken English');
    expect(pdf).toContain('Excel for Office Work');
    expect(pdf).toContain('BDT 2160.00');
    expect(pdf).toContain('Test mode: no real money was charged.');
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('points the cross-reference table at real byte offsets', () => {
    const pdf = buildInvoicePdf(invoice).toString('latin1');
    const startxref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref');
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
    expect(offsets.length).toBe(6);
    for (const offset of offsets) expect(pdf.slice(offset, offset + 3)).toMatch(/^\d+ 0/);
  });

  it('escapes parentheses so a course title cannot break the content stream', () => {
    const pdf = buildInvoicePdf({ ...invoice, items: [{ title: 'Typing (fast) \\ safely', pricePaisa: 1000 }] }).toString('latin1');
    expect(pdf).toContain('\\(fast\\)');
  });
});
