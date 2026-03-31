import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartWrapperProps {
  data: DataPoint[];
  dataKey?: string;
  xDataKey?: string;
  color?: string;
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
  payload?: Array<{ value: number }>;
  label?: string;
  formatValue?: (v: number) => string;
}) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">
          {formatValue ? formatValue(val) : val}
        </p>
      </div>
    );
  }
  return null;
};

export const BarChartWrapper: React.FC<BarChartWrapperProps> = ({
  data,
  dataKey = 'value',
  xDataKey = 'name',
  color = '#FFFFFF',
  height = 200,
  formatValue,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
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
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
};
