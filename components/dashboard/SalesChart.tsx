'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: Array<{ date: string; tn: number; fx: number }>
}

export function SalesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
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
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          iconType="square"
          iconSize={8}
          formatter={(v) => (v === 'tn' ? 'Tienda Nube' : 'Flexus')}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="tn" fill="#3B82F6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="fx" fill="#F59E0B" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
