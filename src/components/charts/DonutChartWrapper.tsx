import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DonutDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartWrapperProps {
  data: DonutDataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutDataPoint }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">{payload[0].name}</p>
        <p className="text-sm font-semibold text-white">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const DonutChartWrapper: React.FC<DonutChartWrapperProps> = ({
  data,
  height = 220,
  innerRadius = 55,
  outerRadius = 80,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
};
