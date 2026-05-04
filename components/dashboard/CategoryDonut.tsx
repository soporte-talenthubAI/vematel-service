'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4']

interface Props {
  data: Array<{ category: string; amount: number }>
}

export function CategoryDonut({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [`$${Number(v).toLocaleString('es-AR')}`, 'Ventas']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10 }}
          formatter={(v) => v}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
