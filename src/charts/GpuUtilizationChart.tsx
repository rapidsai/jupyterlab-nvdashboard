import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget } from '@jupyterlab/ui-components';
import {
  BarChart,
  Bar,
  Cell,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { scaleLinear } from 'd3-scale';
import { renderCustomTooltip } from '../components/tooltipUtils';
import { barColorLinearRange } from '../assets/constants';
import AutoSizer from 'react-virtualized-auto-sizer';

const GpuUtilizationChart = (): JSX.Element => {
  const [gpuUtilization, setGpuUtilization] = useState([]);

  useEffect(() => {
    async function fetchGPUUtilization() {
      const response = await requestAPI<any>('gpu_utilization');
      setGpuUtilization(response.gpu_utilization);
    }

    fetchGPUUtilization();
  }, []);

  useEffect(() => {
    async function fetchGPUUtilization() {
      const response = await requestAPI<any>('gpu_utilization');
      setGpuUtilization(response.gpu_utilization);
    }
    const intervalId = setInterval(() => {
      fetchGPUUtilization();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const data = gpuUtilization.map((utilization, index) => ({
    name: `GPU ${index}`,
    utilization: utilization
  }));

  const colorScale = scaleLinear<string>()
    .domain([0, 100])
    .range(barColorLinearRange);

  return (
    <div className="gradient-background">
      <strong className="chart-title">GPU Utilization</strong>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <BarChart
            layout="vertical"
            width={width * 0.98}
            height={height * 0.95}
            data={data}
          >
            <CartesianGrid horizontal={false} />

            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
              tick={{ fill: 'var(--nv-custom-tick-color)' }}
              className="nv-axis-custom"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'var(--nv-custom-tick-color)' }}
              className="nv-axis-custom"
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={(data: any) =>
                renderCustomTooltip(data, {
                  valueFormatter: value => `${value}%`
                })
              }
            />

            <Bar dataKey="utilization" barSize={50} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorScale(parseInt(entry.utilization)).toString()}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSizer>
    </div>
  );
};

export class GpuUtilizationChartWidget extends ReactWidget {
  render(): JSX.Element {
    return <GpuUtilizationChart />;
  }
}
