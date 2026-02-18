'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { fetchWithError, formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';
import { Expense, Invoice, Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type RangePreset = 'last_12_months' | 'custom';

interface MonthlyRow {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

interface ExpenseCategoryRow {
  label: string;
  amount: number;
  percentage: number;
}

export default function FinancialReportsPage() {
  const { pb, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [preset, setPreset] = useState<RangePreset>('last_12_months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const past = new Date(now);
    past.setFullYear(past.getFullYear() - 1);
    if (preset === 'last_12_months') {
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  }, [preset]);

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const [invoicesRes, paymentsRes, expensesRes] = await Promise.all([
          fetchWithError(
            () =>
              pb.collection('invoices').getList(1, 500, {
                sort: '-invoice_date',
              }),
            'Gagal memuat invoice'
          ),
          fetchWithError(
            () =>
              pb.collection('payments').getList(1, 500, {
                sort: '-payment_date',
              }),
            'Gagal memuat pembayaran'
          ),
          fetchWithError(
            () =>
              pb.collection('expenses').getList(1, 500, {
                sort: '-expense_date',
              }),
            'Gagal memuat pengeluaran'
          ),
        ]);

        const firstError = invoicesRes.error || paymentsRes.error || expensesRes.error;

        if (firstError) {
          const message = firstError || 'Gagal memuat data laporan keuangan';
          toast.error(message);
        }

        setInvoices(((invoicesRes.data as any)?.items as Invoice[]) || []);
        setPayments(((paymentsRes.data as any)?.items as Payment[]) || []);
        setExpenses(((expensesRes.data as any)?.items as Expense[]) || []);
      } catch (error) {
        const message = getPocketBaseErrorMessage(
          error,
          'Terjadi kesalahan saat memuat laporan keuangan'
        );
        console.error('[v0] Financial reports fetch error:', error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pb, isAuthenticated]);

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

  const revenueInRange = useMemo(() => {
    return invoices
      .filter((inv) => withinRange(inv.invoice_date))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [invoices, startDate, endDate]);

  const expensesInRange = useMemo(() => {
    return expenses
      .filter((exp) => withinRange(exp.expense_date))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses, startDate, endDate]);

  const cashFlowInRange = useMemo(() => {
    const cashIn = payments
      .filter((p) => withinRange(p.payment_date))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashOut = expensesInRange;
    return cashIn - cashOut;
  }, [payments, expensesInRange, startDate, endDate]);

  const netProfit = revenueInRange - expensesInRange;
  const profitMargin = revenueInRange > 0 ? (netProfit / revenueInRange) * 100 : 0;

  const monthlyBreakdown = useMemo<MonthlyRow[]>(() => {
    const revenueMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    invoices.forEach((inv) => {
      if (!withinRange(inv.invoice_date)) return;
      if (!inv.invoice_date) return;
      const d = new Date(inv.invoice_date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueMap.set(key, (revenueMap.get(key) || 0) + (inv.total_amount || 0));
    });

    expenses.forEach((exp) => {
      if (!withinRange(exp.expense_date)) return;
      if (!exp.expense_date) return;
      const d = new Date(exp.expense_date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      expenseMap.set(key, (expenseMap.get(key) || 0) + (exp.amount || 0));
    });

    const keys = Array.from(new Set([...revenueMap.keys(), ...expenseMap.keys()])).sort();

    const rows: MonthlyRow[] = keys.map((key) => {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr) - 1;
      const d = new Date(year, month, 1);
      const label = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
      const revenue = revenueMap.get(key) || 0;
      const expensesValue = expenseMap.get(key) || 0;
      const net = revenue - expensesValue;
      const margin = revenue > 0 ? (net / revenue) * 100 : 0;
      return {
        key,
        label,
        revenue,
        expenses: expensesValue,
        netProfit: net,
        profitMargin: margin,
      };
    });

    return rows;
  }, [invoices, expenses, startDate, endDate]);

  const monthlyTotals = useMemo(() => {
    const totalRevenue = monthlyBreakdown.reduce((sum, row) => sum + row.revenue, 0);
    const totalExpenses = monthlyBreakdown.reduce((sum, row) => sum + row.expenses, 0);
    const totalNet = monthlyBreakdown.reduce((sum, row) => sum + row.netProfit, 0);
    const totalMargin = totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0;
    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: totalNet,
      profitMargin: totalMargin,
    };
  }, [monthlyBreakdown]);

  const expensesByCategory = useMemo<ExpenseCategoryRow[]>(() => {
    const inRangeExpenses = expenses.filter((exp) => withinRange(exp.expense_date));
    const total = inRangeExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    if (total <= 0) return [];

    const byCategory: Record<string, number> = {};
    inRangeExpenses.forEach((exp) => {
      const key = exp.category || 'Lainnya';
      byCategory[key] = (byCategory[key] || 0) + (exp.amount || 0);
    });

    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map<ExpenseCategoryRow>(([label, amount]) => ({
        label,
        amount,
        percentage: (amount / total) * 100,
      }));
  }, [expenses, startDate, endDate]);

  const expenseRatio = revenueInRange > 0 ? (expensesInRange / revenueInRange) * 100 : 0;

  const revenueGrowth = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    const periodDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000);

    const revenueCurrent = invoices
      .filter((inv) => {
        if (!inv.invoice_date) return false;
        let value = inv.invoice_date;
        if (value.includes(' ')) value = value.replace(' ', 'T');
        const d = new Date(value);
        if (isNaN(d.getTime())) return false;
        return d >= start && d <= end;
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const revenuePrevious = invoices
      .filter((inv) => {
        if (!inv.invoice_date) return false;
        let value = inv.invoice_date;
        if (value.includes(' ')) value = value.replace(' ', 'T');
        const d = new Date(value);
        if (isNaN(d.getTime())) return false;
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    if (revenuePrevious <= 0) return 0;
    return ((revenueCurrent - revenuePrevious) / revenuePrevious) * 100;
  }, [invoices, startDate, endDate]);

  const breakEvenAchieved = revenueInRange >= expensesInRange && revenueInRange > 0;

  return (
    <MainLayout title="Financial Reports">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Financial Report</h1>
            <p className="text-sm text-slate-400">
              Revenue, expenses, and profitability analysis.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreset('last_12_months')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  preset === 'last_12_months'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Last 12 months
              </button>
              <button
                type="button"
                onClick={() => setPreset('custom')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  preset === 'custom'
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
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200 h-9"
                />
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200 h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400">
              {formatCurrency(revenueInRange)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Total Expenses
            </p>
            <p className="text-xl md:text-2xl font-bold text-red-400">
              {formatCurrency(expensesInRange)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Net Profit
            </p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400">
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Profit Margin
            </p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400">
              {profitMargin.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Cash Flow
            </p>
            <p
              className={`text-xl md:text-2xl font-bold ${
                cashFlowInRange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(cashFlowInRange)}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Monthly Financial Breakdown</h2>
          </div>
          {loading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : monthlyBreakdown.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              Tidak ada data dalam rentang tanggal yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Bulan
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Net Profit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Profit Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3 text-slate-200">{row.label}</td>
                      <td className="px-6 py-3 text-right text-slate-200">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-6 py-3 text-right text-red-300">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-200">
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-200">
                        {row.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900/70">
                    <td className="px-6 py-3 font-semibold text-slate-100">Total</td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-100">
                      {formatCurrency(monthlyTotals.revenue)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-red-300">
                      {formatCurrency(monthlyTotals.expenses)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-100">
                      {formatCurrency(monthlyTotals.netProfit)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-100">
                      {monthlyTotals.profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Expenses by Category</h2>
          </div>
          {loading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : expensesByCategory.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              Tidak ada data pengeluaran dalam rentang tanggal yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      % of Total Expenses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expensesByCategory.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3 text-slate-200 capitalize">{row.label}</td>
                      <td className="px-6 py-3 text-right text-slate-200">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-200">
                        {row.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Expense Ratio
            </p>
            <p className="text-2xl font-bold text-slate-100">{expenseRatio.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Revenue Growth
            </p>
            <p
              className={`text-2xl font-bold ${
                revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {revenueGrowth.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">
              Break-even Point
            </p>
            <p
              className={`text-lg font-semibold ${
                breakEvenAchieved ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {breakEvenAchieved ? 'Achieved' : 'Not achieved'}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

