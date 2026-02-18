'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { fetchWithError, formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';
import { Account, Expense, Invoice, JournalEntry, Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ReportRange = 'month' | 'quarter' | 'year' | 'custom';

interface SummaryRow {
  label: string;
  value: number;
}

export default function AccountingReportsPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [range, setRange] = useState<ReportRange>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const [invoicesRes, paymentsRes, expensesRes, accountsRes, journalRes] =
          await Promise.all([
            fetchWithError(
              () =>
                pb.collection('invoices').getList(1, 200, {
                  sort: '-invoice_date',
                }),
              'Gagal memuat invoice'
            ),
            fetchWithError(
              () =>
                pb.collection('payments').getList(1, 200, {
                  sort: '-payment_date',
                }),
              'Gagal memuat pembayaran'
            ),
            fetchWithError(
              () =>
                pb.collection('expenses').getList(1, 200, {
                  sort: '-expense_date',
                }),
              'Gagal memuat pengeluaran'
            ),
            fetchWithError(
              () =>
                pb.collection('chart_of_accounts').getList(1, 200, {
                  sort: 'code',
                }),
              'Gagal memuat chart of accounts'
            ),
            fetchWithError(
              () =>
                pb.collection('journal_entries').getList(1, 500, {
                  sort: '-entry_date',
                }),
              'Gagal memuat jurnal'
            ),
          ]);

        const firstError =
          invoicesRes.error ||
          paymentsRes.error ||
          expensesRes.error ||
          accountsRes.error ||
          journalRes.error;

        if (firstError) {
          const message = firstError || 'Gagal memuat data laporan akuntansi';
          toast.error(message);
        }

        setInvoices(
          ((invoicesRes.data as any)?.items as Invoice[]) || []
        );
        setPayments(
          ((paymentsRes.data as any)?.items as Payment[]) || []
        );
        setExpenses(
          ((expensesRes.data as any)?.items as Expense[]) || []
        );
        setAccounts(
          ((accountsRes.data as any)?.items as Account[]) || []
        );
        setJournalEntries(
          ((journalRes.data as any)?.items as JournalEntry[]) || []
        );
      } catch (error) {
        const message = getPocketBaseErrorMessage(
          error,
          'Terjadi kesalahan saat memuat laporan akuntansi'
        );
        console.error('[v0] Accounting reports fetch error:', error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pb, isAuthenticated]);

  useEffect(() => {
    const now = new Date();
    if (range === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    } else if (range === 'year') {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    }
  }, [range]);

  const withinRange = (raw: string | undefined) => {
    if (!raw) return false;
    let value = raw;
    if (value.includes(' ')) value = value.replace(' ', 'T');
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    if (!startDate && !endDate) return true;
    const start = startDate ? new Date(startDate + 'T00:00:00') : undefined;
    const end = endDate ? new Date(endDate + 'T23:59:59') : undefined;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const incomeSummary = useMemo<SummaryRow[]>(() => {
    const inRangeInvoices = invoices.filter((inv) => withinRange(inv.invoice_date));
    const inRangePayments = payments.filter((pay) => withinRange(pay.payment_date));

    const billed = inRangeInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paid = inRangePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = billed - paid;

    return [
      { label: 'Pendapatan Ditagihkan (Invoice)', value: billed },
      { label: 'Pembayaran Diterima', value: paid },
      { label: 'Piutang Usaha', value: outstanding },
    ];
  }, [invoices, payments, startDate, endDate]);

  const expenseSummary = useMemo<SummaryRow[]>(() => {
    const inRangeExpenses = expenses.filter((exp) => withinRange(exp.expense_date));
    const total = inRangeExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const byCategory: Record<string, number> = {};
    inRangeExpenses.forEach((exp) => {
      const key = exp.category || 'lainnya';
      byCategory[key] = (byCategory[key] || 0) + (exp.amount || 0);
    });

    const detail = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map<SummaryRow>(([label, value]) => ({ label, value }));

    return [{ label: 'Total Pengeluaran', value: total }, ...detail];
  }, [expenses, startDate, endDate]);

  const totalIncome = incomeSummary[0]?.value || 0;
  const totalExpenses = expenseSummary[0]?.value || 0;
  const profit = totalIncome - totalExpenses;

  const journalPlSummary = useMemo(() => {
    if (!journalEntries.length || !accounts.length) {
      return {
        revenue: 0,
        expenses: 0,
        profit: 0,
      };
    }

    const inRangeEntries = journalEntries.filter((entry) => withinRange(entry.entry_date));

    let revenue = 0;
    let expensesTotal = 0;

    inRangeEntries.forEach((entry) => {
      const account = accounts.find((a) => a.id === entry.account_id);
      if (!account) return;

      const debit = entry.debit || 0;
      const credit = entry.credit || 0;

      if (account.type === 'revenue') {
        const change = credit - debit;
        revenue += change;
      } else if (account.type === 'expense') {
        const change = debit - credit;
        expensesTotal += change;
      }
    });

    const journalProfit = revenue - expensesTotal;

    return {
      revenue,
      expenses: expensesTotal,
      profit: journalProfit,
    };
  }, [journalEntries, accounts, startDate, endDate]);

  return (
    <MainLayout title="Reports & Analytics">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Reports & Analytics</h1>
            <p className="text-sm text-slate-400">Business performance insights and analytics.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRange('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  range === 'month'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Bulan ini
              </button>
              <button
                type="button"
                onClick={() => setRange('year')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  range === 'year'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Tahun ini
              </button>
              <button
                type="button"
                onClick={() => setRange('custom')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  range === 'custom'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Custom
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200 h-9"
                />
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200 h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Pendapatan Bersih (Invoice)
            </p>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Total Pengeluaran
            </p>
            <p className="text-3xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Laba / Rugi
            </p>
            <p
              className={`text-3xl font-bold ${
                profit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(profit)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white mb-2">Sales Reports</h2>
              <p className="text-sm text-slate-300 mb-3">
                Track your sales performance over time
              </p>
              <ul className="text-sm text-slate-400 space-y-1 mb-4">
                <li>Daily, weekly, and monthly sales trends</li>
                <li>Sales by payment method</li>
                <li>Sales by product category</li>
                <li>Top-selling products</li>
              </ul>
            </div>
            <div>
              <Link
                href="/accounting/reports/sales"
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-xs font-medium text-white"
              >
                View Full Report
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white mb-2">Financial Reports</h2>
              <p className="text-sm text-slate-300 mb-3">Analyze your financial performance</p>
              <ul className="text-sm text-slate-400 space-y-1 mb-4">
                <li>Revenue and profit margins</li>
                <li>Expense tracking</li>
                <li>Cash flow analysis</li>
                <li>Tax summaries</li>
              </ul>
            </div>
            <div>
              <Link
                href="/accounting/reports/financial"
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-xs font-medium text-white"
              >
                View Full Report
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Pendapatan (Jurnal)
            </p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-400">
              {formatCurrency(journalPlSummary.revenue)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Beban (Jurnal)
            </p>
            <p className="text-2xl md:text-3xl font-bold text-red-400">
              {formatCurrency(journalPlSummary.expenses)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">
              Laba / Rugi (Jurnal)
            </p>
            <p
              className={`text-2xl md:text-3xl font-bold ${
                journalPlSummary.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(journalPlSummary.profit)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-10 flex items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Memuat data laporan...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Ringkasan Pendapatan</h2>
              <div className="space-y-2">
                {incomeSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-sm text-slate-200"
                  >
                    <span className="text-slate-400">{row.label}</span>
                    <span className="font-semibold">{formatCurrency(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Ringkasan Pengeluaran</h2>
              <div className="space-y-2">
                {expenseSummary.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-sm text-slate-200"
                  >
                    <span className="text-slate-400 capitalize">{row.label}</span>
                    <span className="font-semibold">{formatCurrency(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
