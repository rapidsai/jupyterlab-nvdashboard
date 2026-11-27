/*
 * SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { act, render } from '@testing-library/react';
import { MachineResourceChartWidget } from '../MachineResourceChart';

let processData: (response: any, isPaused: boolean) => void;
const chartData: { [title: string]: any[] } = {};

jest.mock('../../assets/hooks', () => ({
  loadSettingRegistry: jest.fn(),
  useWebSocket: (_e: string, _p: boolean, _f: number, callback: any) => {
    processData = callback;
  }
}));
jest.mock('../../components/customLineChart', () => ({
  CustomLineChart: ({ title, data }: any) => {
    chartData[title] = data;
    return null;
  }
}));
jest.mock('../../components/formatUtils', () => ({
  formatDate: String,
  formatBytes: String
}));
jest.mock('../../assets/icons', () => ({
  pauseIcon: { react: () => null },
  playIcon: { react: () => null }
}));
jest.mock('@jupyterlab/ui-components', () => ({
  ReactWidget: class {
    addClass() {
      return;
    }
  },
  Button: () => null
}));
jest.mock('d3-scale', () => ({
  scaleLinear: () => ({ range: () => () => '' })
}));
jest.mock('recharts', () => ({
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Brush: () => null,
  LineChart: () => null
}));
jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ width: 100, height: 100 })
);

describe('MachineResourceChart', () => {
  it('reports disk and network rates in bytes per second', () => {
    render(new MachineResourceChartWidget({} as any).render());
    const sample = (time: number, bytes: number) => ({
      time,
      disk_read: bytes,
      disk_write: bytes * 2,
      network_read: bytes * 3,
      network_write: bytes * 4
    });

    act(() => processData(sample(1000, 0), false));
    // 100 bytes read in 100 ms is 1000 B/s
    act(() => processData(sample(1100, 100), false));

    const data = chartData['Disk I/O Bandwidth [B/s]'];
    expect(data[1]).toMatchObject({
      disk_read_current: 1000,
      disk_write_current: 2000,
      network_read_current: 3000,
      network_write_current: 4000
    });
  });
});
