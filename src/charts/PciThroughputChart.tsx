import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget } from '@jupyterlab/ui-components';
import { BarChart, Bar, Cell, YAxis, XAxis, Tooltip } from 'recharts';
import { scaleLinear } from 'd3-scale';
import { renderCustomTooltip } from '../components/tooltipUtils';
import AutoSizer from 'react-virtualized-auto-sizer';
import { formatBytes } from '../components/formatUtils';
import {
  BAR_COLOR_LINEAR_RANGE,
  DEFAULT_UPDATE_FREQUENCY
} from '../assets/constants';
import { IChartProps } from '../assets/interfaces';
import loadSettingRegistry from '../assets/hooks';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
interface IDataProps {
  pci_tx: number[];
  pci_rx: number[];
  max_rxtx_tp: number;
}

const PciThroughputChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [pciStats, setPciStats] = useState<IDataProps>();
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );

  loadSettingRegistry(settingRegistry, setUpdateFrequency);

  useEffect(() => {
    async function fetchGPUMemory() {
      const response = await requestAPI<IDataProps>('pci_stats');
      console.log(response);
      setPciStats(response);
    }

    fetchGPUMemory();
  }, []);

  useEffect(() => {
    async function fetchGPUMemory() {
      const response = await requestAPI<IDataProps>('pci_stats');
      setPciStats(response);
    }
    const intervalId = setInterval(() => {
      fetchGPUMemory();
    }, updateFrequency);

    return () => clearInterval(intervalId);
  }, []);

  const gpuCount = pciStats?.pci_tx.length;
  const data = Array.from(Array(gpuCount).keys()).map(index => ({
    name: `GPU ${index}`,
    rx: pciStats?.pci_rx[index] || 0,
    tx: pciStats?.pci_tx[index] || 0,
    maxTP: pciStats?.max_rxtx_tp || 0
  }));

  const colorScale = scaleLinear<string>()
    .domain([0, 1])
    .range(BAR_COLOR_LINEAR_RANGE);

  return (
    <div className="gradient-background">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div style={{ width, height }}>
            <strong className="chart-title multi-chart-title">
              TX PCIe [B/s]
            </strong>

            <BarChart
              width={width * 0.98}
              height={(height * 0.95) / 2}
              data={data}
            >
              <YAxis
                type="number"
                domain={[0, pciStats?.max_rxtx_tp || 0]}
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
              RX PCIe [B/s]
            </strong>

            <BarChart
              width={width * 0.98}
              height={(height * 0.95) / 2}
              data={data}
            >
              <YAxis
                type="number"
                domain={[0, pciStats?.max_rxtx_tp || 0]}
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

export class PciThroughputChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.addClass('size-constrained-widgets');
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <PciThroughputChart settingRegistry={this.settingRegistry} />;
  }
}
