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
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICPUResourceProps, IChartProps } from '../assets/interfaces';
import { loadSettingRegistry, useWebSocket } from '../assets/hooks';

/**
 * Component to display CPU resource charts in the Nvdashboard.
 */
const MachineResourceChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [cpuData, setCpuData] = useState<ICPUResourceProps[]>([]);
  const [tempData, setTempData] = useState<ICPUResourceProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);
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

  // Process incoming data from the WebSocket and manage the CPU data state.
  const processData = (response: ICPUResourceProps, isPaused: any) => {
    if (cpuData.length > 0) {
      response = {
        ...response,
        disk_read_current:
          response.disk_read - cpuData[cpuData.length - 1].disk_read,
        disk_write_current:
          response.disk_write - cpuData[cpuData.length - 1].disk_write,
        network_read_current:
          response.network_read - cpuData[cpuData.length - 1].network_read,
        network_write_current:
          response.network_write - cpuData[cpuData.length - 1].network_write
      };
    }
    if (!isPaused) {
      setCpuData(prevData => {
        let newData;
        if (tempData.length > 1) {
          newData = [...prevData, ...tempData, response];
        } else {
          newData = [...prevData, response];
        }
        // Truncate data if it exceeds the maximum records limit.
        if (newData.length > maxRecords) {
          newData = newData.slice(-1 * maxRecords);
        }
        return newData;
      });
      setTempData([]);
    } else {
      setTempData([...tempData, response]);
    }
  };

  // Establish a WebSocket connection and listen for data updates.
  useWebSocket<ICPUResourceProps>(
    'cpu_resource',
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
  const colorScale = scaleLinear<string>().range(GPU_COLOR_CATEGORICAL_RANGE);

  return (
    <div className="gradient-background">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div style={{ width, height }}>
            <CustomLineChart
              data={cpuData}
              title={'CPU Utilization [%]'}
              yDomain={[0, 100]}
              xFormatter={formatDate}
              yFormatter={value => `${value}%`}
              width={width}
              height={(height - 60) / 5}
              syncId="cpu-resource-sync"
            >
              <Line
                dataKey={'cpu_utilization'}
                name={'CPU Utilization'}
                stroke={colorScale(0)}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
            <CustomLineChart
              data={cpuData}
              title={'Memory Usage [B]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={(height - 60) / 5}
              syncId="cpu-resource-sync"
            >
              <Line
                dataKey={'memory_usage'}
                name={'Memory Usage'}
                stroke={colorScale(1)}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
            <CustomLineChart
              data={cpuData}
              title={'Disk I/O Bandwidth [B/s]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={(height - 60) / 5}
              syncId="cpu-resource-sync"
            >
              <Line
                dataKey={'disk_read_current'}
                name={'Disk Read'}
                stroke={colorScale(0)}
                type="monotone"
                isAnimationActive={false}
              />
              <Line
                dataKey={'disk_write_current'}
                name={'Disk Write'}
                stroke={colorScale(1)}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
            <CustomLineChart
              data={cpuData}
              title={'Network I/O Bandwidth [B/s]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={(height - 60) / 5}
              syncId="cpu-resource-sync"
            >
              <Line
                dataKey={'network_read_current'}
                name={'Network Read'}
                stroke={colorScale(0)}
                type="monotone"
                isAnimationActive={false}
              />
              <Line
                dataKey={'network_write_current'}
                name={'Network Write'}
                stroke={colorScale(1)}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
            {/* Render the control panel with the pause/play button and the time brush */}
            <div
              style={{
                width: width,
                height: 50,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LineChart
                data={cpuData}
                width={width * 0.95}
                syncId="cpu-resource-sync"
                height={50}
                compact={true}
              >
                <XAxis dataKey="time" height={0} />
                <YAxis height={0} />
                <Brush
                  dataKey={'time'}
                  tickFormatter={formatDate}
                  startIndex={Math.max(cpuData.length - 10, 0)}
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
 * A widget for rendering the Machine resource chart in JupyterLab.
 */
export class MachineResourceChartWidget extends ReactWidget {
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    /* Time series charts need to have a min height for seekbar to be visible without scrolling*/
    this.addClass('size-constrained-widgets-lg');
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <MachineResourceChart settingRegistry={this.settingRegistry} />;
  }
}
