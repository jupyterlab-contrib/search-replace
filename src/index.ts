import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { searchIcon } from '@jupyterlab/ui-components';

import { SearchReplaceView, SearchReplaceModel } from './searchReplace';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log('JupyterLab extension search-replace is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('search-replace settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for search-replace.', reason);
        });
    }

    const searchReplacePlugin = new SearchReplaceView();
    const searchReplaceModel = new SearchReplaceModel();

    searchReplaceModel.getSearchString('strange');

    searchReplacePlugin.title.caption = 'Search and replace';
    searchReplacePlugin.id = 'jp-search-replace';
    searchReplacePlugin.title.icon = searchIcon;
    app.shell.add(searchReplacePlugin, 'left');
    //get an icon
  }
};

export default plugin;
