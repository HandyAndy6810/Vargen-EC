import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: '2025-03-31.basil' })
  : null;

export async function createPaymentLink(params: {
  invoiceId: number;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  currency: string;
  customerEmail?: string;
}): Promise<{ id: string; url: string }> {
  if (!stripe) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to environment.');

  const product = await stripe.products.create({
    name: `Invoice ${params.invoiceNumber}`,
    description: params.description,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: params.amountCents,
    currency: params.currency,
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoiceId: String(params.invoiceId) },
    ...(params.customerEmail && {
      customer_creation: 'always',
    }),
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: { custom_message: 'Payment received — thank you.' },
    },
  });

  return { id: link.id, url: link.url };
}
