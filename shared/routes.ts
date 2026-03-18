import { z } from 'zod';
import { insertCustomerSchema, insertJobSchema, insertQuoteSchema, insertQuoteItemSchema, insertUserSettingsSchema, insertInvoiceSchema, customers, jobs, quotes, quoteItems, userSettings, invoices, jobTimerEntries, portalFeedback } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id',
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.object({ ok: z.boolean() }),
        404: errorSchemas.notFound,
        409: z.object({ message: z.string() }),
      },
    },
  },
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs',
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id',
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/jobs',
      input: insertJobSchema,
      responses: {
        201: z.custom<typeof jobs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/jobs/:id',
      input: insertJobSchema.partial(),
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  quotes: {
    list: {
      method: 'GET' as const,
      path: '/api/quotes',
      responses: {
        200: z.array(z.custom<typeof quotes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quotes',
      input: insertQuoteSchema,
      responses: {
        201: z.custom<typeof quotes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/quotes/:id',
      input: insertQuoteSchema.partial(),
      responses: {
        200: z.custom<typeof quotes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/quotes/:id',
      responses: {
        200: z.object({ ok: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
  },
  invoices: {
    list: {
      method: 'GET' as const,
      path: '/api/invoices',
      responses: {
        200: z.array(z.custom<typeof invoices.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/invoices/:id',
      responses: {
        200: z.custom<typeof invoices.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    createFromQuote: {
      method: 'POST' as const,
      path: '/api/invoices/from-quote/:quoteId',
      responses: {
        201: z.custom<typeof invoices.$inferSelect>(),
        404: errorSchemas.notFound,
        409: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/invoices/:id',
      input: insertInvoiceSchema.partial(),
      responses: {
        200: z.custom<typeof invoices.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  timers: {
    active: {
      method: 'GET' as const,
      path: '/api/timers/active',
      responses: {
        200: z.custom<typeof jobTimerEntries.$inferSelect>().nullable(),
      },
    },
    listForJob: {
      method: 'GET' as const,
      path: '/api/jobs/:jobId/timers',
      responses: {
        200: z.array(z.custom<typeof jobTimerEntries.$inferSelect>()),
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/timers/start',
      input: z.object({ jobId: z.number() }),
      responses: {
        201: z.custom<typeof jobTimerEntries.$inferSelect>(),
        409: z.object({ message: z.string() }),
      },
    },
    stop: {
      method: 'POST' as const,
      path: '/api/timers/:id/stop',
      input: z.object({ notes: z.string().optional() }),
      responses: {
        200: z.custom<typeof jobTimerEntries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/timers/:id',
      responses: {
        200: z.object({ ok: z.boolean() }),
      },
    },
  },
  portal: {
    get: {
      method: 'GET' as const,
      path: '/api/portal/:token',
      responses: {
        200: z.object({
          quote: z.custom<typeof quotes.$inferSelect>(),
          customer: z.custom<typeof customers.$inferSelect>().nullable(),
          items: z.array(z.custom<typeof quoteItems.$inferSelect>()),
          businessName: z.string(),
          businessPhone: z.string(),
          businessEmail: z.string(),
          businessAddress: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    accept: {
      method: 'POST' as const,
      path: '/api/portal/:token/accept',
      responses: {
        200: z.object({ ok: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    feedback: {
      method: 'POST' as const,
      path: '/api/portal/:token/feedback',
      input: z.object({ message: z.string() }),
      responses: {
        201: z.custom<typeof portalFeedback.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  followUps: {
    due: {
      method: 'GET' as const,
      path: '/api/follow-ups/due',
      responses: {
        200: z.array(z.object({
          quote: z.custom<typeof quotes.$inferSelect>(),
          dueIndex: z.number(),
          dayNumber: z.number(),
        })),
      },
    },
    markSent: {
      method: 'POST' as const,
      path: '/api/follow-ups/:quoteId/mark-sent',
      input: z.object({ dayIndex: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    skip: {
      method: 'POST' as const,
      path: '/api/follow-ups/:quoteId/skip',
      input: z.object({ dayIndex: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.custom<typeof userSettings.$inferSelect>().nullable(),
        401: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/settings',
      input: insertUserSettingsSchema.partial().omit({ userId: true }),
      responses: {
        200: z.custom<typeof userSettings.$inferSelect>(),
      },
    },
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
