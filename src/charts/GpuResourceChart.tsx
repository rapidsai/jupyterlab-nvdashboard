import React, { useState, useEffect } from 'react';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import { Line, XAxis, YAxis, Brush, LineChart } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import { requestAPI } from '../handler';
import { CustomLineChart } from '../components/customLineChart';
import { formatDate, formatBytes } from '../components/formatUtils';
import { scaleLinear } from 'd3-scale';
import {
  DEFAULT_UPDATE_FREQUENCY,
  GPU_COLOR_CATEGORICAL_RANGE
} from '../assets/constants';
import { pauseIcon, playIcon } from '../assets/icons';
import loadSettingRegistry from '../assets/hooks';
import { IChartProps } from '../assets/interfaces';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

interface IDataProps {
  time: number;
  gpu_utilization_total: number;
  gpu_memory_total: number;
  rx_total: number;
  tx_total: number;
  gpu_utilization_individual: number[];
  gpu_memory_individual: number[];
}

const GpuResourceChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [gpuData, setGpuData] = useState<IDataProps[]>([]);
  const [tempData, setTempData] = useState<IDataProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ngpus = gpuData[0]?.gpu_utilization_individual.length || 0;
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );

  loadSettingRegistry(settingRegistry, setUpdateFrequency);

  useEffect(() => {
    async function fetchGpuUsage() {
      const response = await requestAPI<IDataProps>('gpu_resource');
      if (!isPaused) {
        setGpuData(prevData => {
          if (tempData.length > 1) {
            prevData = [...prevData, ...tempData];
          }
          const newData = [...prevData, response];
          return newData;
        });
        setTempData([]);
      } else {
        setTempData([...tempData, response]);
      }
    }

    const interval = setInterval(fetchGpuUsage, updateFrequency);

    return () => clearInterval(interval);
  }, [isPaused, tempData]);

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };

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
