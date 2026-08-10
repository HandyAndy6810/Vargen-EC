import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { join } from 'path';

// Square SDK v44 uses CJS exports, so it's required at runtime rather than bundled.
// The production build emits CJS (script/build.ts), where esbuild replaces
// `import.meta` with {} — so import.meta.url is undefined and an unguarded
// createRequire(undefined) throws at module load, crashing the server on boot.
// Fall back to a cwd-based resolution base, and keep the whole load fail-safe:
// Square is optional, so a failure here must leave squareClient null, not kill
// the process.
let _squarePkg: any = null;
try {
  const requireBase = import.meta.url || join(process.cwd(), 'index.js');
  _squarePkg = createRequire(requireBase)('square');
} catch {}
const Client   = _squarePkg?.Client   ?? _squarePkg?.SquareClient   ?? null;
const Environment = _squarePkg?.Environment ?? _squarePkg?.SquareEnvironment ?? null;

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
export const locationId = process.env.SQUARE_LOCATION_ID || '';

export const squareClient = (accessToken && Client && Environment)
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
