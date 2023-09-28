import React from 'react';
import { XAxis, YAxis, Tooltip, Legend, Brush, LineChart } from 'recharts';
import { renderCustomTooltip } from '../components/tooltipUtils';

export const CustomLineChart = ({
  data,
  title = '',
  yDomain,
  xFormatter,
  yFormatter,
  width,
  height,
  syncId,
  children
}: {
  data: any[];
  title?: string;
  yDomain?: [number, number];
  xFormatter?: (value: number | string | undefined) => string;
  yFormatter?: (value: number | undefined) => string;
  width: number;
  height: number;
  syncId: string;
  children?: React.ReactNode;
}) => (
  <>
    <strong className="chart-title multi-chart-title">{title}</strong>
    <LineChart data={data} width={width * 0.95} height={height} syncId={syncId}>
      <XAxis
        dataKey="time"
        tickFormatter={xFormatter}
        tick={{ fill: 'var(--jp-ui-font-color0)' }}
      />
      <YAxis
        domain={yDomain}
        tickFormatter={yFormatter}
        tick={{ fill: 'var(--jp-ui-font-color0)' }}
      />
      <Tooltip
        content={(data: any) =>
          renderCustomTooltip(data, {
            labelFormatter: xFormatter,
            valueFormatter: yFormatter
          })
        }
      />
      <Legend verticalAlign="top" align="right" />
      {children}
      <Brush
        height={0.1}
        startIndex={Math.max(data.length - 10, 0)}
        className="hidden-brush-for-sync"
      />
    </LineChart>
  </>
);
