import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette, IFrame, MainAreaWidget } from '@jupyterlab/apputils';

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
  activate: (app: JupyterFrontEnd, labShell: ILabShell, palette?: ICommandPalette) => {
    const iframe = new IFrame();
    const widget = new MainAreaWidget({ content: iframe });
    iframe.url = '/bokeh';

    app.commands.addCommand(COMMAND_ID, {
      label: 'Bokeh document',
      execute: () => {
        labShell.add(widget, 'main');
      }
    });

    if (palette) {
      palette.addItem({ command: COMMAND_ID, category: 'Bokeh' });
    }
  }
};

export default extension;
