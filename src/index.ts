import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { BokehDashboard, BokehDashboardLauncher, IDashboardItem } from './dashboard';

import '../style/index.css';

const COMMAND_ID = 'bokeh-server:launch-document';

/**
 * Initialization data for the jupyterlab-bokeh-server extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-bokeh-server',
  autoStart: true,
  requires: [ILabShell],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    palette?: ICommandPalette
  ) => {

    const sidebar = new BokehDashboardLauncher({
      launchItem: (item: IDashboardItem) => {
        app.commands.execute(COMMAND_ID, item);
      }
    });
    sidebar.id = 'bokeh-dashboard-launcher';
    sidebar.title.iconClass = 'jp-ExtensionIcon jp-SideBar-tabIcon';
    sidebar.title.caption = 'Dask';
    labShell.add(sidebar, 'left');

    app.commands.addCommand(COMMAND_ID, {
      label: 'Bokeh document',
      execute: args => {
        const item = args as IDashboardItem;
        const widget = new BokehDashboard();
        widget.item = item;
        labShell.add(widget, 'main');
      }
    });

    if (palette) {
      palette.addItem({ command: COMMAND_ID, category: 'Bokeh' });
    }
  }
};

export default extension;
