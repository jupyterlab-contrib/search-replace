import { addJupyterLabThemeChangeListener } from '@jupyter-notebook/web-components';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { FileBrowserModel, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { searchIcon } from '@jupyterlab/ui-components';
import { SearchReplaceView } from './view';
import { SearchReplaceModel } from './model';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  requires: [IFileBrowserFactory],
  optional: [ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('search-replace');
    addJupyterLabThemeChangeListener();

    const searchReplaceModel = new SearchReplaceModel();
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          const onSettingsChanged = (settings: ISettingRegistry.ISettings) => {
            searchReplaceModel.defaultExcludeFilters = settings.get('exclude')
              .composite as string[];
          };
          onSettingsChanged(settings);
          settings.changed.connect(onSettingsChanged);
        })
        .catch(reason => {
          console.error(`Failed to load settings ${plugin.id}.`, reason);
        });
    }

    const fileBrowser = factory.defaultBrowser;
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
