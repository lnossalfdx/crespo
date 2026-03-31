import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  [key: string]: string | number;
}

interface AreaSeries {
  dataKey: string;
  color: string;
  label: string;
}

interface AreaChartWrapperProps {
  data: DataPoint[];
  series: AreaSeries[];
  xDataKey?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatValue?: (v: number) => string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <p className="text-sm font-semibold text-white">
              {formatValue ? formatValue(p.value) : p.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AreaChartWrapper: React.FC<AreaChartWrapperProps> = ({
  data,
  series,
  xDataKey = 'name',
  height = 260,
  formatValue,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.dataKey} id={`gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
        <XAxis
          dataKey={xDataKey}
          tick={{ fill: '#666666', fontSize: 11 }}
          axisLine={{ stroke: '#2A2A2A' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666666', fontSize: 11 }}
          axisLine={{ stroke: '#2A2A2A' }}
          tickLine={false}
          tickFormatter={(v) => formatValue ? formatValue(v) : String(v)}
          width={60}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#gradient-${s.dataKey})`}
            dot={false}
            activeDot={{ r: 4, fill: s.color }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
