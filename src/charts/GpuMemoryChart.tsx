import React, { useState } from 'react';
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
import {
  BAR_COLOR_LINEAR_RANGE,
  DEFAULT_UPDATE_FREQUENCY
} from '../assets/constants';
import { format } from 'd3-format';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { loadSettingRegistry, useWebSocket } from '../assets/hooks';
import { IChartProps, IGpuUsageProps } from '../assets/interfaces';

// GpuMemoryChart component displays a bar chart representing GPU memory usage.
const GpuMemoryChart: React.FC<IChartProps> = ({
  settingRegistry
}): JSX.Element => {
  const [gpuMemory, setGpuMemory] = useState<IGpuUsageProps>({
    memory_usage: [],
    total_memory: []
  });
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // Load settings and initialize WebSocket connection
  loadSettingRegistry(settingRegistry, setUpdateFrequency, setIsSettingsLoaded);
  useWebSocket<IGpuUsageProps>(
    'gpu_usage',
    false,
    updateFrequency,
    setGpuMemory,
    isSettingsLoaded
  );

  // Prepare data for rendering
  const data = gpuMemory.memory_usage.map((memory, index) => ({
    name: `GPU ${index}`,
    memory: memory,
    totalMemory: gpuMemory.total_memory[index]
  }));

  // Create a color scale for the bars
  const colorScale = scaleLinear<string>().range(BAR_COLOR_LINEAR_RANGE);

  // Calculate the sum of GPU memory usage
  const usageSum = data?.reduce((sum, data) => sum + data.memory, 0);

  // Formatter for displaying bytes
  const formatBytes = (value: number): string => {
    return `${format('.2s')(value)}B`;
  };

  return (
    <div className="gradient-background">
      <strong className="chart-title">
        {' '}
        GPU Memory: {formatBytes(usageSum)}{' '}
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
              domain={[0, Math.max(...gpuMemory.total_memory)]}
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
                  fill={colorScale(entry.memory / entry.totalMemory).toString()}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSizer>
    </div>
  );
};

// GpuMemoryChartWidget is a ReactWidget that renders the GpuMemoryChart component.
export class GpuMemoryChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.addClass('size-constrained-widgets');
    this.settingRegistry = settingRegistry;
  }

  render(): JSX.Element {
    return <GpuMemoryChart settingRegistry={this.settingRegistry} />;
  }
}
