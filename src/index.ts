import { addJupyterLabThemeChangeListener } from '@jupyter-notebook/web-components';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { FileBrowserModel, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { searchIcon } from '@jupyterlab/ui-components';
import { SearchReplaceModel, SearchReplaceView } from './searchReplace';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  requires: [IFileBrowserFactory],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('search-replace');
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
      app.commands,
      trans
    );

    searchReplacePlugin.title.caption = trans.__('Search and Replace');
    searchReplacePlugin.id = 'jp-search-replace';
    searchReplacePlugin.title.icon = searchIcon;
    app.shell.add(searchReplacePlugin, 'left');
  }
};

export default plugin;
