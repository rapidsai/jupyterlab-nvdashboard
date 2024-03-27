import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

export interface IChartProps {
  settingRegistry: ISettingRegistry;
}

export interface IControlProps {
  app: JupyterFrontEnd;
  labShell: ILabShell;
  tracker: WidgetTracker;
  settingRegistry: ISettingRegistry;
}

export interface IWidgetInfo {
  id: string;
  title: string;
  instance: MainAreaWidget;
}

export interface IGpuResourceProps {
  time: number;
  gpu_utilization_total: number;
  gpu_memory_total: number;
  rx_total: number;
  tx_total: number;
  gpu_utilization_individual: number[];
  gpu_memory_individual: number[];
}

export interface IGpuUtilizationProps {
  gpu_utilization: number[];
}

export interface IGpuUsageProps {
  memory_usage: number[];
  total_memory: number[];
}

export interface ICPUResourceProps {
  time: number;
  cpu_utilization: number;
  memory_usage: number;
  disk_read: number;
  disk_write: number;
  network_read: number;
  network_write: number;
  disk_read_current: number;
  disk_write_current: number;
  network_read_current: number;
  network_write_current: number;
}

export interface INVLinkThroughputProps {
  nvlink_tx: number[];
  nvlink_rx: number[];
  max_rxtx_bw: number;
}

export interface INVLinkTimeLineProps {
  time: number;
  nvlink_tx: number[];
  nvlink_rx: number[];
  max_rxtx_bw: number;
}

export interface IPCIThroughputProps {
  pci_tx: number[];
  pci_rx: number[];
  max_rxtx_tp: number;
}
