import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import '../style/index.css';

/**
 * Initialization data for the jupyterlab-bokeh-server extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-bokeh-server',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-bokeh-server is activated!');
  }
};

export default extension;
