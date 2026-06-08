export const api = {
  customers: {
    list: { path: '/api/customers' },
    get: { path: '/api/customers/:id' },
    create: { path: '/api/customers' },
    update: { path: '/api/customers/:id' },
    delete: { path: '/api/customers/:id' },
  },
  jobs: {
    list: { path: '/api/jobs' },
    get: { path: '/api/jobs/:id' },
    create: { path: '/api/jobs' },
    update: { path: '/api/jobs/:id' },
    reconciliation: { path: '/api/jobs/:id/reconciliation' },
  },
  quotes: {
    list: { path: '/api/quotes' },
    get: { path: '/api/quotes/:id' },
    create: { path: '/api/quotes' },
    update: { path: '/api/quotes/:id' },
    delete: { path: '/api/quotes/:id' },
  },
  invoices: {
    list: { path: '/api/invoices' },
    get: { path: '/api/invoices/:id' },
    createFromQuote: { path: '/api/invoices/from-quote/:quoteId' },
    update: { path: '/api/invoices/:id' },
  },
  settings: {
    get: { path: '/api/settings' },
    update: { path: '/api/settings' },
  },
  receipts: {
    list: { path: '/api/receipts' },
    get: { path: '/api/receipts/:id' },
    create: { path: '/api/receipts' },
    delete: { path: '/api/receipts/:id' },
    scan: { path: '/api/receipts/scan' },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
