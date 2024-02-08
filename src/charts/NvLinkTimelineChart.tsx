import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import AutoSizer from 'react-virtualized-auto-sizer';
import { CustomLineChart } from '../components/customLineChart';
import { Line, XAxis, YAxis, Brush, LineChart } from 'recharts';
import { formatDate, formatBytes } from '../components/formatUtils';
import { pauseIcon, playIcon } from '../assets/icons';
import { scaleLinear } from 'd3-scale';
import {
  DEFAULT_UPDATE_FREQUENCY,
  GPU_COLOR_CATEGORICAL_RANGE
} from '../assets/constants';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IChartProps } from '../assets/interfaces';
import loadSettingRegistry from '../assets/hooks';

interface IDataProps {
  time: number;
  nvlink_tx: number[];
  nvlink_rx: number[];
  max_rxtx_bw: number;
}

const NvLinkTimelineChart: React.FC<IChartProps> = ({ settingRegistry }) => {
  const [nvlinkStats, setNvLinkStats] = useState<IDataProps[]>([]);
  const [tempData, setTempData] = useState<IDataProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ngpus = nvlinkStats[0]?.nvlink_tx.length || 0;
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );

  loadSettingRegistry(settingRegistry, setUpdateFrequency);

  useEffect(() => {
    async function fetchNvLinkStats() {
      const response = await requestAPI<IDataProps>('nvlink_throughput');
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

    const interval = setInterval(fetchNvLinkStats, updateFrequency);

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
                      dataKey={`nvlink_tx[${index}]`}
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
                      dataKey={`nvlink_rx[${index}]]`}
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
  constructor(private settingRegistry: ISettingRegistry) {
    super();
    this.addClass('size-constrained-widgets');
    this.settingRegistry = settingRegistry;
  }
  render(): JSX.Element {
    return <NvLinkTimelineChart settingRegistry={this.settingRegistry} />;
  }
}
