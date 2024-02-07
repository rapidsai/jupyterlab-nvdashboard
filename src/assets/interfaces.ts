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
