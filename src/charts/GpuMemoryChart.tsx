import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget } from '@jupyterlab/ui-components';
import { BarChart, Bar, Cell, YAxis, XAxis, Tooltip } from 'recharts';
import { scaleThreshold } from 'd3-scale';
import { renderCustomTooltip } from '../components/tooltipUtils';
import { format } from 'd3-format';
import AutoSizer from 'react-virtualized-auto-sizer';

const GpuMemoryChart = (): JSX.Element => {
  const [gpuMemory, setGpuMemory] = useState([]);
  const [gpuTotalMemory, setGpuTotalMemory] = useState([]);

  useEffect(() => {
    async function fetchGPUMemory() {
      const response = await requestAPI<any>('gpu_usage');
      setGpuMemory(response.memory_usage);
      // set gpuTotalMemory to max of total memory array returned from API
      setGpuTotalMemory(response.total_memory);
    }

    fetchGPUMemory();
  }, []);

  useEffect(() => {
    async function fetchGPUMemory() {
      const response = await requestAPI<any>('gpu_usage');
      setGpuMemory(response.memory_usage);
      setGpuTotalMemory(response.total_memory);
    }
    const intervalId = setInterval(() => {
      fetchGPUMemory();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const data = gpuMemory.map((memory, index) => ({
    name: `GPU ${index}`,
    memory: memory,
    totalMemory: gpuTotalMemory[index]
  }));

  // Create a formatter for displaying bytes

  const colorScale = scaleThreshold<number, string>()
    .domain([0.25, 0.5, 0.75])
    .range(['#A7D95A', '#76B900', '#4D8500', '#FF5733']);

  const usageSum = data.reduce((sum, data) => sum + data.memory, 0);
  const formatBytes = (value: number): string => {
    return `${format('.2s')(value)}B`;
  };

  return (
    <div className="gradient-background">
      <strong className="chart-title">
        {' '}
        GPU Memory: {formatBytes(usageSum)}
      </strong>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <BarChart
            layout="vertical"
            width={width * 0.98}
            height={height * 0.95}
            data={data}
          >
            <XAxis
              type="number"
              domain={[0, Math.max(...gpuTotalMemory)]}
              tickFormatter={formatBytes}
              tick={{ fill: 'var(--jp-ui-font-color0)' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'var(--jp-ui-font-color0)' }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={(data: any) =>
                renderCustomTooltip(data, { valueFormatter: formatBytes })
              }
            />
            <Bar dataKey="memory">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorScale(
                    parseFloat(entry.memory) / parseFloat(entry.totalMemory)
                  ).toString()}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSizer>
    </div>
  );
};

export class GpuMemoryChartWidget extends ReactWidget {
  render(): JSX.Element {
    return <GpuMemoryChart />;
  }
}
