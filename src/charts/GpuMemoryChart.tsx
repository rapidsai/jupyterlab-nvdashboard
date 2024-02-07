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
import { BAR_COLOR_LINEAR_RANGE } from '../assets/constants';
import { format } from 'd3-format';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import loadSettingRegistry from '../assets/hooks';
import { IChartProps } from '../assets/interfaces';

const GpuMemoryChart: React.FC<IChartProps> = ({
  settingRegistry
}): JSX.Element => {
  const [gpuMemory, setGpuMemory] = useState([]);
  const [gpuTotalMemory, setGpuTotalMemory] = useState([]);
  const [updateFrequency, setUpdateFrequency] = useState<number>(1000);

  loadSettingRegistry(settingRegistry, setUpdateFrequency);

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
    }, updateFrequency);

    return () => clearInterval(intervalId);
  }, []);

  const data = gpuMemory.map((memory, index) => ({
    name: `GPU ${index}`,
    memory: memory,
    totalMemory: gpuTotalMemory[index]
  }));

  // Create a formatter for displaying bytes

  const colorScale = scaleLinear<string>().range(BAR_COLOR_LINEAR_RANGE);

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
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.max(...gpuTotalMemory)]}
              tickFormatter={formatBytes}
              className="nv-axis-custom"
            />
            <YAxis type="category" dataKey="name" className="nv-axis-custom" />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={(data: any) =>
                renderCustomTooltip(data, { valueFormatter: formatBytes })
              }
            />
            <Bar dataKey="memory" barSize={50} isAnimationActive={false}>
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
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <GpuMemoryChart settingRegistry={this.settingRegistry} />;
  }
}
