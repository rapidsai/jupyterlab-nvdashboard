import React, { useState } from 'react';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import {
  ReactWidget,
  Button,
  LabIcon,
  settingsIcon
} from '@jupyterlab/ui-components';
import {
  GpuResourceChartWidget,
  GpuMemoryChartWidget,
  GpuUtilizationChartWidget,
  MachineResourceChartWidget,
  PciThroughputChartWidget,
  NvLinkThroughputChartWidget,
  NvLinkTimelineChartWidget
} from './charts';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { gpuIcon, hBarIcon, vBarIcon, lineIcon } from './assets/icons';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IControlProps, IWidgetInfo } from './assets/interfaces';
import {
  COMMAND_OPEN_WIDGET,
  DEFAULT_UPDATE_FREQUENCY,
  PLUGIN_ID_OPEN_SETTINGS
} from './assets/constants';
import { loadSettingRegistry } from './assets/hooks';

// Control component for the GPU Dashboard, which contains buttons to open the GPU widgets
const Control: React.FC<IControlProps> = ({
  app,
  labShell,
  tracker,
  settingRegistry
}) => {
  // Keep track of open widgets
  const openWidgets: IWidgetInfo[] = [];
  const [updateFrequency, setUpdateFrequency] = useState<number>(
    DEFAULT_UPDATE_FREQUENCY
  );

  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  loadSettingRegistry(settingRegistry, setUpdateFrequency, setIsSettingsLoaded);

  if (!app.commands.hasCommand(COMMAND_OPEN_WIDGET)) {
    // Add command to open GPU Dashboard Widget
    app.commands.addCommand(COMMAND_OPEN_WIDGET, {
      label: 'Open GPU Dashboard Widget',
      execute: args => {
        const { id, title } = args as { id: string; title: string };
        openWidgetById(id, title);
      }
    });
  }

  /* Function to create a widget by id and title and add it to the main area,
   or bring it to the front if it is already open */
  const openWidget = (
    widgetCreator: () => ReactWidget,
    id: string,
    title: string
  ) => {
    // Check if a widget with the same id is already open
    const existingWidget = tracker.find(widget => widget.id === id);
    if (existingWidget) {
      if (!existingWidget.isAttached) {
        labShell.add(existingWidget, 'main');
      }
      // If widget is already open, bring it to the front
      labShell.activateById(existingWidget.id);
    } else {
      // If widget is not open, create and add it
      const content = widgetCreator();
      const widgetInstance = new MainAreaWidget({ content });
      widgetInstance.title.label = title;
      widgetInstance.title.caption = title;
      widgetInstance.title.icon = gpuIcon;
      widgetInstance.id = id;
      app.shell.add(widgetInstance, 'main');
      tracker.add(widgetInstance);
      openWidgets.push({ id, title, instance: widgetInstance });

      // Remove the widget from openWidgets when it is closed
      widgetInstance.disposed.connect(() => {
        const index = openWidgets.findIndex(widget => widget.id === id);
        console.log(tracker);
        if (index !== -1) {
          openWidgets.splice(index, 1);
        }
      });
    }
  };

  // Function to open a widget by id and title (used by buttons)
  const openWidgetById = (id: string, title: string) => {
    let widgetFunction;
    switch (id) {
      case 'gpu-memory-widget':
        widgetFunction = () => new GpuMemoryChartWidget(settingRegistry);
        break;
      case 'gpu-utilization-widget':
        widgetFunction = () => new GpuUtilizationChartWidget(settingRegistry);
        break;
      case 'gpu-resource-widget':
        widgetFunction = () => new GpuResourceChartWidget(settingRegistry);
        break;
      case 'machine-resource-widget':
        widgetFunction = () => new MachineResourceChartWidget(settingRegistry);
        break;
      case 'pci-throughput-widget':
        widgetFunction = () => new PciThroughputChartWidget(settingRegistry);
        break;
      case 'nvlink-throughput-widget':
        widgetFunction = () => new NvLinkThroughputChartWidget(settingRegistry);
        break;
      case 'nvlink-throughput-timeseries-widget':
        widgetFunction = () => new NvLinkTimelineChartWidget(settingRegistry);
        break;
      default:
        return;
    }
    openWidget(widgetFunction, id, title);
  };

  const IconTitle = (Icon: LabIcon.IReact, title: string): React.ReactNode => {
    return (
      <span style={{ display: 'flex' }}>
        <Icon className="nv-icon-custom" />
        <span style={{ marginLeft: '10px' }}>{title}</span>
      </span>
    );
  };

  return (
    <div className="gpu-dashboard-container">
      <div className="gpu-dashboard-header">
        <span className="header-text">GPU Dashboards</span>
        <Button
          className="header-button"
          onClick={() => app.commands.execute(PLUGIN_ID_OPEN_SETTINGS)}
        >
          <div className="nv-header-icon-text">settings</div>
          <settingsIcon.react className="nv-header-icon"></settingsIcon.react>
        </Button>
      </div>
      <hr className="gpu-dashboard-divider" />
      <Button
        className="gpu-dashboard-button"
        onClick={() => openWidgetById('gpu-memory-widget', 'GPU Memory')}
      >
        {IconTitle(hBarIcon.react, 'GPU Memory')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById('gpu-utilization-widget', 'GPU Utilization')
        }
      >
        {IconTitle(hBarIcon.react, 'GPU Utilization')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() => openWidgetById('gpu-resource-widget', 'GPU Resources')}
      >
        {IconTitle(lineIcon.react, 'GPU Resources')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById('machine-resource-widget', 'Machine Resources')
        }
      >
        {IconTitle(lineIcon.react, 'Machine Resources')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById('pci-throughput-widget', 'PCIe Throughput')
        }
      >
        {IconTitle(vBarIcon.react, 'PCIe Throughput')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById('nvlink-throughput-widget', 'NVLink Throughput')
        }
      >
        {IconTitle(vBarIcon.react, 'NVLink Throughput')}
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById(
            'nvlink-throughput-timeseries-widget',
            'NVLink Throughput'
          )
        }
      >
        {IconTitle(lineIcon.react, 'NVLink Throughput')}
      </Button>
      <div className="gpu-dashboard-footer">
        <hr className="gpu-dashboard-divider" />
        <span className="gpu-dashboard-footer-body">
          {isSettingsLoaded && `Updated every ${updateFrequency}ms`}
        </span>
      </div>
    </div>
  );
};

export class ControlWidget extends ReactWidget {
  constructor(
    private app: JupyterFrontEnd,
    private labShell: ILabShell,
    private tracker: WidgetTracker,
    private settingRegistry: ISettingRegistry
  ) {
    super();
    this.tracker = tracker;
    this.settingRegistry = settingRegistry;
  }

  render(): JSX.Element {
    return (
      <Control
        app={this.app}
        labShell={this.labShell}
        tracker={this.tracker}
        settingRegistry={this.settingRegistry}
      />
    );
  }
}
