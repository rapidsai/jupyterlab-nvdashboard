import React, { useState } from 'react';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import { Line, XAxis, YAxis, Brush, LineChart } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import { CustomLineChart } from '../components/customLineChart';
import { formatDate, formatBytes } from '../components/formatUtils';
import { scaleLinear } from 'd3-scale';
import {
  DEFAULT_MAX_RECORDS_TIMESERIES,
  DEFAULT_UPDATE_FREQUENCY,
  GPU_COLOR_CATEGORICAL_RANGE
} from '../assets/constants';
import { pauseIcon, playIcon } from '../assets/icons';
import { loadSettingRegistry, useWebSocket } from '../assets/hooks';
import { IChartProps, IGpuResourceProps } from '../assets/interfaces';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Component to display GPU resource charts in the Nvdashboard.
 */
const GpuResourceChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [gpuData, setGpuData] = useState<IGpuResourceProps[]>([]);
  const [tempData, setTempData] = useState<IGpuResourceProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ngpus = gpuData[0]?.gpu_utilization_individual.length || 0;
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );
  const [maxRecords, setMaxRecords] = useState<number>(
    DEFAULT_MAX_RECORDS_TIMESERIES
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // Load settings from the JupyterLab setting registry.
  loadSettingRegistry(
    settingRegistry,
    setUpdateFrequency,
    setIsSettingsLoaded,
    setMaxRecords
  );

  // Process incoming data from the WebSocket and manage the GPU data state.
  const processData = (response: IGpuResourceProps, isPaused: boolean) => {
    if (!isPaused) {
      setGpuData(prevData => {
        let newData =
          tempData.length > 1
            ? [...prevData, ...tempData, response]
            : [...prevData, response];
        // Truncate data if it exceeds the maximum records limit.
        if (newData.length > maxRecords) {
          newData = newData.slice(-maxRecords);
        }
        return newData;
      });
      setTempData([]);
    } else {
      setTempData(prevTempData => [...prevTempData, response]);
    }
  };

  // Establish a WebSocket connection and listen for data updates.
  useWebSocket<IGpuResourceProps>(
    'gpu_resource',
    isPaused,
    updateFrequency,
    processData,
    isSettingsLoaded
  );

  // Handle click events for the pause/play button.
  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };

  // Define a color scale for the chart lines.
  const colorScale = scaleLinear<string>()
    .domain([0, ngpus])
    .range(GPU_COLOR_CATEGORICAL_RANGE);

  return (
    <div className="gradient-background">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div style={{ width, height }}>
            <CustomLineChart
              data={gpuData}
              title={'GPU Utilization (per Device) [%]'}
              yDomain={[0, 100]}
              xFormatter={formatDate}
              yFormatter={value => `${value}%`}
              width={width}
              height={(height - 60) / 5}
              syncId="gpu-resource-sync"
            >
              {gpuData[0] &&
                Object.keys(gpuData[0].gpu_utilization_individual).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_utilization_individual[${index}]`}
                      name={`GPU ${index}`}
                      stroke={colorScale(index)}
                      type="monotone"
                      activeDot={{ fill: 'transparent' }}
                      dot={{ fill: 'transparent' }}
                      isAnimationActive={false}
                    />
                  )
                )}
            </CustomLineChart>
            <CustomLineChart
              data={gpuData}
              title={'GPU Usage (per Device) [B]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={(height - 60) / 5}
              syncId="gpu-resource-sync"
            >
              {gpuData[0] &&
                Object.keys(gpuData[0].gpu_memory_individual).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_memory_individual[${index}]]`}
                      name={`GPU ${index}`}
                      stroke={colorScale(index)}
                      type="monotone"
                      activeDot={{ fill: 'transparent' }}
                      dot={{ fill: 'transparent' }}
                      isAnimationActive={false}
                    />
                  )
                )}
            </CustomLineChart>
            <CustomLineChart
              data={gpuData}
              title={'Total Utilization [%]'}
              xFormatter={formatDate}
              yFormatter={value => `${value}%`}
              yDomain={[0, 100]}
              width={width}
              height={(height - 60) / 5}
              syncId="gpu-resource-sync"
            >
              <Line
                dataKey={'gpu_utilization_total'}
                name={'GPU Utilization Total'}
                stroke={colorScale(0)}
                type="monotone"
                strokeWidth={2}
                activeDot={{ fill: 'transparent' }}
                dot={{ fill: 'transparent' }}
                isAnimationActive={false}
              />
              <Line
                dataKey={'gpu_memory_total'}
                name={'GPU Usage Total'}
                stroke={colorScale(ngpus)}
                strokeWidth={2}
                activeDot={{ fill: 'transparent' }}
                dot={{ fill: 'transparent' }}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
            <CustomLineChart
              data={gpuData}
              title={'Total PCI Throughput [B/s]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={(height - 60) / 5}
              syncId="gpu-resource-sync"
            >
              <Line
                dataKey={'rx_total'}
                name={'RX'}
                stroke={colorScale(0)}
                type="monotone"
                strokeWidth={2}
                activeDot={{ fill: 'transparent' }}
                dot={{ fill: 'transparent' }}
                isAnimationActive={false}
              />
              <Line
                dataKey={'tx_total'}
                name={'TX'}
                stroke={colorScale(ngpus)}
                type="monotone"
                strokeWidth={2}
                activeDot={{ fill: 'transparent' }}
                dot={{ fill: 'transparent' }}
                isAnimationActive={false}
              />
            </CustomLineChart>
            {/* Render the control panel with the pause/play button and the time brush */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: width,
                height: 50
              }}
            >
              <LineChart
                data={gpuData}
                width={width * 0.95}
                syncId="gpu-resource-sync"
                height={50}
                compact={true}
              >
                <XAxis dataKey="time" height={0} />
                <YAxis height={0} />

                <Brush
                  dataKey={'time'}
                  tickFormatter={formatDate}
                  startIndex={Math.max(gpuData.length - 10, 0)}
                  fill="none"
                />
              </LineChart>
              <Button
                onClick={handlePauseClick}
                className="gpu-dashboard-button gpu-dashboard-toolbar-button"
              >
                {isPaused ? (
                  <playIcon.react className="nv-icon-custom-time-series" />
                ) : (
                  <pauseIcon.react className="nv-icon-custom-time-series" />
                )}
              </Button>
            </div>
          </div>
        )}
      </AutoSizer>
    </div>
  );
};

/**
 * A widget for rendering the GPU resource chart in JupyterLab.
 */
export class GpuResourceChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    /* Time series charts need to have a min height for seekbar to be visible without scrolling*/
    this.addClass('size-constrained-widgets-lg');
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <GpuResourceChart settingRegistry={this.settingRegistry} />;
  }
}
