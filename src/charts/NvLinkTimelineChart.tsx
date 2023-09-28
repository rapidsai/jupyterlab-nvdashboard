import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import AutoSizer from 'react-virtualized-auto-sizer';
import { CustomLineChart } from '../components/customLineChart';
import { Line, XAxis, YAxis, Brush, LineChart } from 'recharts';
import { formatDate, formatBytes } from '../components/formatUtils';
import { pauseIcon, playIcon } from '../assets/icons';

interface INvLinkChartProps {
  time: number;
  nvlink_tx: number[];
  nvlink_rx: number[];
  max_rxtx_bw: number;
}

const NvLinkTimelineChart = (): JSX.Element => {
  const [nvlinkStats, setNvLinkStats] = useState<INvLinkChartProps[]>([]);
  const [tempData, setTempData] = useState<INvLinkChartProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchNvLinkStats() {
      const response = await requestAPI<INvLinkChartProps>('nvlink_throughput');
      response.time = Date.now();
      if (!isPaused) {
        setNvLinkStats(prevData => {
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

    const interval = setInterval(fetchNvLinkStats, 1000);

    return () => clearInterval(interval);
  }, [isPaused, tempData]);

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="gradient-background">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div style={{ width, height }}>
            <CustomLineChart
              data={nvlinkStats}
              title={'TX NvLink (per Device) [B/s]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={height / 3}
              syncId="gpu-resource-sync"
            >
              {nvlinkStats[0] &&
                Object.keys(nvlinkStats[0].nvlink_tx).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_utilization_individual[${index}]`}
                      name={`GPU ${index}`}
                      stroke={`hsl(${
                        (index * 180) / nvlinkStats[0].nvlink_tx.length
                      }, 100%, 50%)`}
                      type="monotone"
                      isAnimationActive={false}
                    />
                  )
                )}
            </CustomLineChart>
            <CustomLineChart
              data={nvlinkStats}
              title={'RX NvLink (per Device) [B/s]'}
              xFormatter={formatDate}
              yFormatter={formatBytes}
              width={width}
              height={height / 3}
              syncId="gpu-resource-sync"
            >
              {nvlinkStats[0] &&
                Object.keys(nvlinkStats[0].nvlink_rx).map(
                  (gpu: any, index: number) => (
                    <Line
                      key={index}
                      dataKey={`gpu_memory_individual[${index}]]`}
                      name={`GPU ${index}`}
                      stroke={`hsl(${
                        (index * 180) / nvlinkStats[0].nvlink_rx.length
                      }, 100%, 50%)`}
                      type="monotone"
                      isAnimationActive={false}
                    />
                  )
                )}
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
                data={nvlinkStats}
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
                  startIndex={Math.max(nvlinkStats.length - 10, 0)}
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

export class NvLinkTimelineChartWidget extends ReactWidget {
  render(): JSX.Element {
    return <NvLinkTimelineChart />;
  }
}
