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
  },
  quotes: {
    list: { path: '/api/quotes' },
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
  timers: {
    active: { path: '/api/timers/active' },
    listForJob: { path: '/api/jobs/:jobId/timers' },
    start: { path: '/api/timers/start' },
    stop: { path: '/api/timers/:id/stop' },
    delete: { path: '/api/timers/:id' },
  },
  settings: {
    get: { path: '/api/settings' },
    update: { path: '/api/settings' },
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
