import React from 'react';
import {
  LineChart,
  Line,
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

interface LineChartWrapperProps {
  data: DataPoint[];
  dataKey?: string;
  xDataKey?: string;
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const LineChartWrapper: React.FC<LineChartWrapperProps> = ({
  data,
  dataKey = 'value',
  xDataKey = 'name',
  color = '#FFFFFF',
  height = 200,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
