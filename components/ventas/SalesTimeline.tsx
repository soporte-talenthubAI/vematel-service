'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: Array<{ date: string; tn: number; fx: number }>
}

export function SalesTimeline({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          width={45}
        />
        <Tooltip
          formatter={(v, name) => [
            `$${Number(v).toLocaleString('es-AR')}`,
            name === 'tn' ? 'Tienda Nube' : 'Flexus',
          ]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => (v === 'tn' ? 'Tienda Nube' : 'Flexus')}
        />
        <Line type="monotone" dataKey="tn" stroke="#3B82F6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="fx" stroke="#F59E0B" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
