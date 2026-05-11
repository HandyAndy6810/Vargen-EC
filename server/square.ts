import { Client, Environment } from 'square';
import { randomUUID } from 'crypto';

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
export const locationId = process.env.SQUARE_LOCATION_ID || '';

export const squareClient = accessToken
  ? new Client({
      accessToken,
      environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
    })
  : null;

export async function createSquarePaymentLink(params: {
  invoiceId: number;
  invoiceNumber: string;
  description: string;
  amountCents: bigint;
  currency: string;
  customerEmail?: string;
}): Promise<{ id: string; url: string }> {
  if (!squareClient) throw new Error('Square is not configured. Add SQUARE_ACCESS_TOKEN to environment.');
  if (!locationId) throw new Error('Square is not configured. Add SQUARE_LOCATION_ID to environment.');

  const response = await squareClient.checkoutApi.createPaymentLink({
    idempotencyKey: randomUUID(),
    paymentLink: {
      version: 1,
      checkoutOptions: {
        askForShippingAddress: false,
        redirectUrl: undefined,
      },
      quickPay: {
        name: `Invoice ${params.invoiceNumber}`,
        priceMoney: {
          amount: params.amountCents,
          currency: params.currency,
        },
        locationId,
      },
    },
  });

  const link = response.result.paymentLink;
  if (!link?.id || !link?.longUrl) throw new Error('Square did not return a payment link');
  return { id: link.id, url: link.longUrl };
}
