import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-nvdashboard extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-nvdashboard:plugin',
  description: 'A JupyterLab extension for displaying GPU usage dashboards',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-nvdashboard is activated!');
  }
};

export default plugin;
