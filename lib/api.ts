import PocketBase, { ClientResponseError } from 'pocketbase';
import { Account, Invoice, JournalEntry } from './types';

export async function fetchWithError<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error: any) {
    console.error('[v0] API Error:', error);
    return { error: getPocketBaseErrorMessage(error, errorMessage) };
  }
}

export function getPocketBaseErrorMessage(
  error: unknown,
  fallback: string = 'An error occurred'
): string {
  try {
    if (error instanceof ClientResponseError) {
      const data: any = (error as any).data || (error as any).response || {};
      const fieldErrors =
        data?.data &&
        Object.values<any>(data.data)
          .map((e) => e?.message)
          .filter(Boolean)
          .join(', ');
      const serverMessage = data?.message || (error as any).message;
      if (
        serverMessage &&
        serverMessage.toLowerCase().includes('something went wrong while processing your request')
      ) {
        return fieldErrors || fallback;
      }
      return fieldErrors || serverMessage || fallback;
    }
    if (typeof error === 'object' && error && 'message' in (error as any)) {
      return (error as any).message || fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function formatCurrency(value: number, locale: string = 'id-ID'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date, locale: string = 'id-ID'): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

export function formatDateTime(date: string | Date, locale: string = 'id-ID'): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

export async function uploadFile(pb: PocketBase, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${pb.baseUrl}/api/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: pb.authStore.token,
    },
    body: formData,
  });

  if (!response.ok) throw new Error('File upload failed');

  const data = await response.json();
  return data.filename;
}

export function getFileUrl(pb: PocketBase, collectionId: string, recordId: string, filename: string): string {
  return `${pb.baseUrl}/api/files/${collectionId}/${recordId}/${filename}`;
}

export const orderStatuses = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'amber' },
  { value: 'delivered', label: 'Delivered', color: 'cyan' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

export const invoiceStatuses = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'partial', label: 'Partial', color: 'amber' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'slate' },
];

export const customerTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'government', label: 'Government' },
  { value: 'ngo', label: 'NGO' },
];

export const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer_bank', label: 'Bank Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'giro', label: 'Giro' },
  { value: 'cheque', label: 'Cheque' },
];

export const paymentTypes = [
  { value: 'down_payment', label: 'Down Payment' },
  { value: 'installment', label: 'Installment' },
  { value: 'full_payment', label: 'Full Payment' },
  { value: 'refund', label: 'Refund' },
];

export const menuUnits = [
  { value: 'porsi', label: 'Porsi' },
  { value: 'box', label: 'Box' },
  { value: 'pax', label: 'Pax' },
  { value: 'paket', label: 'Paket' },
  { value: 'loyang', label: 'Loyang' },
  { value: 'kg', label: 'Kg' },
  { value: 'liter', label: 'Liter' },
];

export const ingredientUnits = [
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'liter', label: 'Liter' },
  { value: 'ml', label: 'Ml' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'pack', label: 'Pack' },
  { value: 'ikat', label: 'Ikat' },
  { value: 'buah', label: 'Buah' },
  { value: 'lembar', label: 'Lembar' },
];

export async function syncInvoiceRevenueJournal(pb: PocketBase, invoice: Invoice) {
  try {
    if (!pb || !invoice) return;
    const activeStatuses: Array<Invoice['status']> = ['sent', 'partial', 'paid', 'overdue'];
    const isActive = activeStatuses.includes(invoice.status);
    const totalAmount = invoice.total_amount || invoice.amount || 0;
    const reference = invoice.id;

    if (!isActive || totalAmount <= 0) {
      try {
        const existing = await pb.collection('journal_entries').getList<JournalEntry>(1, 50, {
          filter: `source = "system" && reference = "${reference}"`,
        });
        if (existing.items.length) {
          await Promise.all(
            existing.items.map((entry) => pb.collection('journal_entries').delete(entry.id))
          );
        }
      } catch (error) {
        console.error('[v0] syncInvoiceRevenueJournal cleanup error:', error);
      }
      return;
    }

    const accountsRes = await pb.collection('chart_of_accounts').getList<Account>(1, 1, {
      filter: 'type = "revenue"',
      sort: 'code',
    });
    const revenueAccount = accountsRes.items[0];
    if (!revenueAccount) return;

    const existingRes = await pb.collection('journal_entries').getList<JournalEntry>(1, 1, {
      filter: `source = "system" && reference = "${reference}" && account_id = "${revenueAccount.id}"`,
    });

    const payload: Partial<JournalEntry> = {
      entry_date: invoice.invoice_date,
      account_id: revenueAccount.id,
      reference,
      description: invoice.notes || `Pendapatan invoice ${invoice.invoice_number}`,
      debit: 0,
      credit: totalAmount,
      source: 'system',
    };

    if (existingRes.items.length > 0) {
      const current = existingRes.items[0];
      await pb.collection('journal_entries').update<JournalEntry>(current.id, payload);
    } else {
      await pb.collection('journal_entries').create<JournalEntry>(payload);
    }
  } catch (error) {
    console.error('[v0] syncInvoiceRevenueJournal error:', error);
  }
}
