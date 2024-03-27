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
import AutoSizer from 'react-virtualized-auto-sizer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IChartProps, IGpuUtilizationProps } from '../assets/interfaces';
import { loadSettingRegistry, useWebSocket } from '../assets/hooks';

// GpuUtilizationChart component displays a bar chart representing GPU Utilization usage.
const GpuUtilizationChart: React.FC<IChartProps> = ({
  settingRegistry
}): JSX.Element => {
  const [gpuUtilization, setGpuUtilization] = useState<IGpuUtilizationProps>();
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );

  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // Load settings and initialize WebSocket connection
  loadSettingRegistry(settingRegistry, setUpdateFrequency, setIsSettingsLoaded);
  useWebSocket<IGpuUtilizationProps>(
    'gpu_utilization',
    false,
    updateFrequency,
    setGpuUtilization,
    isSettingsLoaded
  );

  // Prepare data for rendering
  const data = gpuUtilization?.gpu_utilization.map((utilization, index) => ({
    name: `GPU ${index}`,
    utilization: utilization
  }));

  // Create a color scale for the bars
  const colorScale = scaleLinear<string>()
    .domain([0, 100])
    .range(BAR_COLOR_LINEAR_RANGE);

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
              {data?.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorScale(entry.utilization).toString()}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSizer>
    </div>
  );
};

// GpuUtilizationChartWidget is a ReactWidget that renders the GpuUtilizationChart component.
export class GpuUtilizationChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.addClass('size-constrained-widgets');
    this.settingRegistry = settingRegistry;
  }

  render(): JSX.Element {
    return <GpuUtilizationChart settingRegistry={this.settingRegistry} />;
  }
}
