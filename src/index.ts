import { addJupyterLabThemeChangeListener } from '@jupyter-notebook/web-components';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { FileBrowserModel, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IEditorTracker } from '@jupyterlab/fileeditor';
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
    // Request the file editor as we do the replace actions with the editor
    // to take advantage of the editor history.
    editorTracker: IEditorTracker,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('search-replace');
    addJupyterLabThemeChangeListener();

    const searchReplaceModel = new SearchReplaceModel();

    let settings: ISettingRegistry.ISettings | null = null;
    const onAskReplaceChange = async (b: boolean) => {
      if (settings) {
        await settings.set('askReplaceAllConfirmation', b);
      }
    };
    const searchReplacePlugin = new SearchReplaceView(
      searchReplaceModel,
      app.commands,
      trans,
      onAskReplaceChange
    );

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings_ => {
          settings = settings_;
          const onSettingsChanged = (settings: ISettingRegistry.ISettings) => {
            searchReplaceModel.defaultExcludeFilters = settings.get('exclude')
              .composite as string[];
            searchReplaceModel.maxLinesPerFile = settings.get('maxLinesPerFile')
              .composite as number;
            searchReplacePlugin.askReplaceConfirmation = settings.get(
              'askReplaceAllConfirmation'
            ).composite as boolean;
          };
          onSettingsChanged(settings_);
          settings_.changed.connect(onSettingsChanged);
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

    searchReplacePlugin.title.caption = trans.__('Search and Replace');
    searchReplacePlugin.id = 'jp-search-replace';
    searchReplacePlugin.title.icon = searchIcon;
    app.shell.add(searchReplacePlugin, 'left');
  }
};

export default plugin;
