'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ClicksChart({ data }: { data: Array<{ date: string; clicks: number }> }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Clicks over time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="clk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--border-subtle)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
          <YAxis stroke="var(--border-subtle)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="clicks" stroke="var(--brand)" strokeWidth={2} fill="url(#clk)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
