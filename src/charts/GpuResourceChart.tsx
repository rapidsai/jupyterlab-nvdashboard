import React, { useState, useEffect } from 'react';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import { Line, XAxis, YAxis, Brush, LineChart } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import { requestAPI } from '../handler';
import { CustomLineChart } from '../components/customLineChart';
import { formatDate, formatBytes } from '../components/formatUtils';

interface IChartProps {
  time: number;
  gpu_utilization_total: number;
  gpu_memory_total: number;
  rx_total: number;
  tx_total: number;
  gpu_utilization_individual: number[];
  gpu_memory_individual: number[];
}

const GpuResourceChart = () => {
  const [gpuData, setGpuData] = useState<IChartProps[]>([]);
  const [tempData, setTempData] = useState<IChartProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchGpuUsage() {
      const response = await requestAPI<IChartProps>('gpu_resource');
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

    const interval = setInterval(fetchGpuUsage, 1000);

    return () => clearInterval(interval);
  }, [isPaused, tempData]);

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="gradient-background">
      <div style={{ width: '100%', height: '20px' }}>
        <Button
          onClick={handlePauseClick}
          className="gpu-dashboard-toolbar-button"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
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
              height={height / 5}
              syncId="gpu-resource-sync"
            >
              {gpuData[0] &&
                Object.keys(gpuData[0].gpu_utilization_individual).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_utilization_individual[${index}]`}
                      name={`GPU ${index}`}
                      stroke={`hsl(${
                        (index * 180) /
                        gpuData[0].gpu_utilization_individual.length
                      }, 100%, 50%)`}
                      type="monotone"
                      isAnimationActive={false}
                    />
                  )
                )}
            </CustomLineChart>
            <CustomLineChart
              data={gpuData}
              title={'GPU Usage (per Device) [%]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={height / 5}
              syncId="gpu-resource-sync"
            >
              {gpuData[0] &&
                Object.keys(gpuData[0].gpu_memory_individual).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_memory_individual[${index}]]`}
                      name={`GPU ${index}`}
                      stroke={`hsl(${
                        (index * 180) / gpuData[0].gpu_memory_individual.length
                      }, 100%, 50%)`}
                      type="monotone"
                      isAnimationActive={false}
                    />
                  )
                )}
            </CustomLineChart>
            <CustomLineChart
              data={gpuData}
              title={'Total Utilization [%]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={height / 5}
              syncId="gpu-resource-sync"
            >
              <Line
                dataKey={'gpu_utilization_total'}
                name={'GPU Utilization Total'}
                stroke={'hsl(0, 100%, 50%)'}
                type="monotone"
                isAnimationActive={false}
              />
              <Line
                dataKey={'gpu_memory_total'}
                name={'GPU Usage Total'}
                stroke={'hsl(90, 100%, 50%)'}
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
              height={height / 5}
              syncId="gpu-resource-sync"
            >
              <Line
                dataKey={'rx_total'}
                name={'RX'}
                stroke={'hsl(0, 100%, 50%)'}
                type="monotone"
                isAnimationActive={false}
              />
              <Line
                dataKey={'tx_total'}
                name={'TX'}
                stroke={'hsl(90, 100%, 50%)'}
                type="monotone"
                isAnimationActive={false}
              />
            </CustomLineChart>
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
          </div>
        )}
      </AutoSizer>
    </div>
  );
};

export class GpuResourceChartWidget extends ReactWidget {
  render() {
    return <GpuResourceChart />;
  }
}
