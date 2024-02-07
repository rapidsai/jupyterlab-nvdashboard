import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ControlWidget } from './launchWidget';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { gpuIcon } from './assets/icons';
import {
  COMMAND_OPEN_SETTINGS,
  COMMAND_OPEN_WIDGET,
  PLUGIN_ID,
  PLUGIN_ID_CONFIG,
  PLUGIN_ID_OPEN_SETTINGS,
  WIDGET_TRACKER_NAME
} from './assets/constants';

/**
 * Initialization data for the react-widget extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'A minimal JupyterLab extension using a React Widget.',
  autoStart: true,
  requires: [ILabShell, ISettingRegistry],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    settingRegistry: ISettingRegistry,
    restorer: ILayoutRestorer | null
  ) => {
    const tracker = new WidgetTracker<MainAreaWidget>({
      namespace: WIDGET_TRACKER_NAME
    });

    app.commands.addCommand(PLUGIN_ID_OPEN_SETTINGS, {
      label: 'Open Settings',
      execute: () => {
        app.commands.execute(COMMAND_OPEN_SETTINGS, {
          query: PLUGIN_ID
        });
      }
    });

    settingRegistry
      .load(PLUGIN_ID_CONFIG)
      .then(settings => {
        console.log(`${PLUGIN_ID} settings loaded`);
      })
      .catch(reason => {
        console.error(`Failed to load settings for ${PLUGIN_ID}.`, reason);
      });

    const controlWidget = new ControlWidget(
      app,
      labShell,
      tracker,
      settingRegistry
    );
    controlWidget.id = 'gpu-dashboard';
    controlWidget.title.icon = gpuIcon;
    controlWidget.title.caption = 'GPU Dashboards';

    if (restorer) {
      // Add state restoration for the widget so they can be restored on reload
      restorer.add(controlWidget, 'gpu-dashboard');
      // Track and restore the chart widgets states so they can be restored on reload
      restorer.restore(tracker, {
        command: COMMAND_OPEN_WIDGET,
        args: widget => ({ id: widget.id, title: widget.title.label }),
        name: widget => widget.title.label
      });
    }
    // If there is a restorer, restore the widget
    // Add control widget to the left area
    labShell.add(controlWidget, 'left', { rank: 200 });
  }
};

export default extension;
