import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { searchIcon } from '@jupyterlab/ui-components';
import { addJupyterLabThemeChangeListener } from '@jupyter-notebook/web-components';

import { SearchReplaceView, SearchReplaceModel } from './searchReplace';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension search-replace is activated!');
    addJupyterLabThemeChangeListener();

    const searchReplaceModel = new SearchReplaceModel();
    const searchReplacePlugin = new SearchReplaceView(
      searchReplaceModel,
      app.commands
    );

    // Test call
    // searchReplaceModel.getSearchString('strange');

    searchReplacePlugin.title.caption = 'Search and replace';
    searchReplacePlugin.id = 'jp-search-replace';
    searchReplacePlugin.title.icon = searchIcon;
    app.shell.add(searchReplacePlugin, 'left');
  }
};

export default plugin;
