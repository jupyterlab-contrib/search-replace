import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { searchIcon } from '@jupyterlab/ui-components';
import { addJupyterLabThemeChangeListener } from '@jupyter-notebook/web-components';

import { IChangedArgs } from '@jupyterlab/coreutils';
import { SearchReplaceView, SearchReplaceModel } from './searchReplace';
import { IFileBrowserFactory, FileBrowserModel } from '@jupyterlab/filebrowser';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  requires: [IFileBrowserFactory],
  activate: (app: JupyterFrontEnd, factory: IFileBrowserFactory) => {
    console.log('JupyterLab extension search-replace is activated!');
    addJupyterLabThemeChangeListener();

    const fileBrowser = factory.defaultBrowser;
    const searchReplaceModel = new SearchReplaceModel();
    Promise.all([app.restored, fileBrowser.model.restored]).then(() => {
      searchReplaceModel.path = fileBrowser.model.path;
    });

    const onPathChanged = (
      model: FileBrowserModel,
      change: IChangedArgs<string>
    ) => {
      searchReplaceModel.path = change.newValue;
    };

    fileBrowser.model.pathChanged.connect(onPathChanged);
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
