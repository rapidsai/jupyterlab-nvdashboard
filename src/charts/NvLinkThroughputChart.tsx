import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/ui-components';
import { BarChart, Bar, Cell, YAxis, XAxis, Tooltip } from 'recharts';
import { scaleLinear } from 'd3-scale';
import { renderCustomTooltip } from '../components/tooltipUtils';
import { format } from 'd3-format';
import {
  BAR_COLOR_LINEAR_RANGE,
  DEFAULT_UPDATE_FREQUENCY
} from '../assets/constants';
import AutoSizer from 'react-virtualized-auto-sizer';
import { IChartProps, INVLinkThroughputProps } from '../assets/interfaces';
import { loadSettingRegistry, useWebSocket } from '../assets/hooks';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

// NvLinkThroughputChart component displays a bar chart representing nvlink throughput data.
const NvLinkThroughputChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [nvlinkStats, setNvLinkStats] = useState<INVLinkThroughputProps>();
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // Load settings and initialize WebSocket connection
  loadSettingRegistry(settingRegistry, setUpdateFrequency, setIsSettingsLoaded);
  useWebSocket<INVLinkThroughputProps>(
    'nvlink_throughput',
    false,
    updateFrequency,
    setNvLinkStats,
    isSettingsLoaded
  );

  // Prepare data for rendering
  const gpuCount = nvlinkStats?.nvlink_rx.length;
  const data = Array.from(Array(gpuCount).keys()).map(index => ({
    name: `GPU ${index}`,
    rx: nvlinkStats?.nvlink_rx[index] || 0,
    tx: nvlinkStats?.nvlink_tx[index] || 0,
    maxTP: nvlinkStats?.max_rxtx_bw || 0
  }));

  // Create a color scale for the bars
  const colorScale = scaleLinear<string>()
    .domain([0, 1])
    .range(BAR_COLOR_LINEAR_RANGE);

  // Formatter for displaying bytes
  const formatBytes = (bytes: number): string => {
    return `${format('.2s')(bytes)}B`;
  };

  return (
    <div className="gradient-background">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div style={{ width, height }}>
            <strong className="chart-title multi-chart-title">
              TX NvLink [B/s]
            </strong>

            <BarChart
              width={width * 0.98}
              height={(height * 0.95) / 2}
              data={data}
            >
              <YAxis
                type="number"
                domain={[0, nvlinkStats?.max_rxtx_bw || 0]}
                tickFormatter={formatBytes}
                className="nv-axis-custom"
              />
              <XAxis
                type="category"
                dataKey="name"
                className="nv-axis-custom"
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={(data: any) =>
                  renderCustomTooltip(data, { valueFormatter: formatBytes })
                }
              />
              <Bar dataKey="tx" barSize={50} isAnimationActive={false}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorScale(entry.tx / entry.maxTP)}
                  />
                ))}
              </Bar>
            </BarChart>
            <strong className="chart-title multi-chart-title">
              RX NvLink [B/s]
            </strong>

            <BarChart
              width={width * 0.98}
              height={(height * 0.95) / 2}
              data={data}
            >
              <YAxis
                type="number"
                domain={[0, nvlinkStats?.max_rxtx_bw || 0]}
                tickFormatter={formatBytes}
                className="nv-axis-custom"
              />
              <XAxis
                type="category"
                dataKey="name"
                className="nv-axis-custom"
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={(data: any) =>
                  renderCustomTooltip(data, { valueFormatter: formatBytes })
                }
              />
              <Bar dataKey="rx" barSize={50} isAnimationActive={false}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colorScale(entry.rx / entry.maxTP)}
                  />
                ))}
              </Bar>
            </BarChart>
          </div>
        )}
      </AutoSizer>
    </div>
  );
};

export class NvLinkThroughputChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.addClass('size-constrained-widgets');
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <NvLinkThroughputChart settingRegistry={this.settingRegistry} />;
  }
}
