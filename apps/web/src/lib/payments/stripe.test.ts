import { describe, expect, it } from 'vitest';
import { paidOrderFromStripeEvent, stripeCheckoutBody } from './stripe';

const order = {
  id: '671111111111111111111111',
  orderNumber: 'PS-20261116-ABCDEF12',
  courseSlug: 'spoken-english-daily',
  courseTitle: { bn: 'ইংরেজি', en: 'Everyday Spoken English' },
  amountPaisa: 120000,
  discountPaisa: 24000,
  totalPaisa: 96000,
  status: 'pending',
  provider: null,
  providerRef: null,
  couponCode: 'EARLYBIRD',
  receiptNumber: null,
  paidAt: null,
  refundedAt: null,
  createdAt: '2026-11-16T10:00:00.000Z',
};

describe('stripeCheckoutBody', () => {
  it('sends the discounted total in paisa and carries the order id in metadata', () => {
    const body = stripeCheckoutBody(order, 'https://example.com/ok', 'https://example.com/cancel');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('96000');
    expect(body.get('line_items[0][price_data][currency]')).toBe('bdt');
    expect(body.get('metadata[orderId]')).toBe(order.id);
    expect(body.get('client_reference_id')).toBe(order.orderNumber);
  });
});

describe('paidOrderFromStripeEvent', () => {
  const base = {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_intent: 'pi_test_1', metadata: { orderId: '671111111111111111111111' } } },
  };

  it('extracts the order and payment intent from a completed session', () => {
    expect(paidOrderFromStripeEvent(base)).toEqual({
      orderId: '671111111111111111111111',
      providerRef: 'pi_test_1',
    });
  });

  it('ignores unrelated events and sessions without an order', () => {
    expect(paidOrderFromStripeEvent({ ...base, type: 'customer.created' })).toBeNull();
    expect(paidOrderFromStripeEvent({ ...base, data: { object: { id: 'cs_test_1', metadata: {} } } })).toBeNull();
  });
});
