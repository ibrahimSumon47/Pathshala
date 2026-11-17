import { getOrderForUser } from '@pathshala/db';
import { auth } from '@/auth';
import { buildInvoicePdf, invoiceNumberFor } from '@/lib/invoice';

type RouteContext = { params: Promise<{ orderNumber: string }> };

/**
 * A PDF invoice belongs to the learner who paid it. Only paid or refunded orders produce
 * one, because a pending order has nothing to invoice yet.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const order = await getOrderForUser(orderNumber, session.user.id);
  if (!order) return new Response('Not found', { status: 404 });
  if (order.status !== 'paid' && order.status !== 'refunded') {
    return new Response('This order is not paid yet.', { status: 409 });
  }

  const invoiceNumber = invoiceNumberFor(order.receiptNumber, order.orderNumber);
  const pdf = buildInvoicePdf({
    invoiceNumber,
    orderNumber: order.orderNumber,
    paidAt: order.paidAt,
    status: order.status,
    studentName: session.user.name ?? 'Learner',
    studentEmail: session.user.email ?? '',
    items: order.items.map((item) => ({ title: item.title.en ?? item.title.bn ?? item.slug, pricePaisa: item.pricePaisa })),
    subtotalPaisa: order.amountPaisa,
    discountPaisa: order.discountPaisa,
    totalPaisa: order.totalPaisa,
    provider: order.provider,
    couponCode: order.couponCode,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${invoiceNumber}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
