import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  loading?: boolean;
  trend?: { value: number; isPositive: boolean };
}

export function StatCard({ icon: Icon, label, value, loading, trend }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-orange-500/10 rounded-lg">
          <Icon size={20} className="text-orange-500" />
        </div>
        {trend && (
          <div
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>

      {loading ? (
        <div className="h-8 bg-slate-800 rounded animate-pulse"></div>
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
    </div>
  );
}
