export interface Customer {
  id: number;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  xeroContactId: string | null;
  createdAt: string | null;
}

export interface InsertCustomer {
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  xeroContactId?: string | null;
}

export interface Job {
  id: number;
  userId: string | null;
  customerId: number | null;
  title: string;
  description: string | null;
  address: string | null;
  status: string | null;
  scheduledDate: Date | string | null;
  estimatedDuration: number | null;
  completionData: string | null;
  createdAt: Date | string | null;
}

export interface InsertJob {
  userId?: string | null;
  customerId?: number | null;
  title: string;
  description?: string | null;
  address?: string | null;
  status?: string | null;
  scheduledDate?: Date | string | null;
  estimatedDuration?: number | null;
  completionData?: string | null;
}

export interface Quote {
  id: number;
  userId: string | null;
  jobId: number | null;
  customerId: number | null;
  totalAmount: string;
  status: string | null;
  content: string | null;
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  shareToken: string | null;
  followUpSchedule: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

export interface Invoice {
  id: number;
  userId: string | null;
  quoteId: number | null;
  customerId: number | null;
  invoiceNumber: string;
  status: string | null;
  items: string;
  subtotal: string;
  gstAmount: string | null;
  totalAmount: string;
  dueDate: string | null;
  paidDate: string | null;
  paidAmount: string | null;
  notes: string | null;
  stripePaymentLinkId: string | null;
  stripePaymentLinkUrl: string | null;
  createdAt: string | null;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  password: string | null;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
