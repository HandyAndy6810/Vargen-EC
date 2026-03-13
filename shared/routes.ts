import { z } from 'zod';
import { insertCustomerSchema, insertJobSchema, insertQuoteSchema, insertQuoteItemSchema, insertUserSettingsSchema, customers, jobs, quotes, quoteItems, userSettings } from './schema';

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
