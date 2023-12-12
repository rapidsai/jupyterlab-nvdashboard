import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ControlWidget } from './launchWidget';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { gpuIcon } from './assets/icons';

/**
 * Initialization data for the react-widget extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'react-widget',
  description: 'A minimal JupyterLab extension using a React Widget.',
  autoStart: true,
  requires: [ILabShell],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    restorer: ILayoutRestorer | null
  ) => {
    const tracker = new WidgetTracker<MainAreaWidget>({
      namespace: 'gpu-dashboard-widgets'
    });
    const controlWidget = new ControlWidget(app, labShell, tracker);
    controlWidget.id = 'gpu-dashboard';
    controlWidget.title.icon = gpuIcon;
    controlWidget.title.caption = 'GPU Dashboards';

    // If there is a restorer, restore the widget
    if (restorer) {
      // Add state restoration for the widget so they can be restored on reload
      restorer.add(controlWidget, 'gpu-dashboard');
      // Track and restore the chart widgets states so they can be restored on reload
      restorer.restore(tracker, {
        command: 'gpu-dashboard-widget:open',
        args: widget => ({ id: widget.id, title: widget.title.label }),
        name: widget => widget.title.label
      });
    }

    // Add control widget to the left area
    labShell.add(controlWidget, 'left', { rank: 200 });
  }
};

export default extension;
