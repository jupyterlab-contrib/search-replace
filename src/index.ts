import { addJupyterLabThemeChangeListener } from '@jupyter/web-components';
import { INotebookTree } from '@jupyter-notebook/tree';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISanitizer } from '@jupyterlab/apputils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  FileBrowserModel,
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { searchIcon } from '@jupyterlab/ui-components';
import { SearchReplaceModel } from './model';
import { SearchReplaceView } from './view';

/**
 * Initialization data for the search-replace extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-search-replace:plugin',
  autoStart: true,
  requires: [ISanitizer, IFileBrowserFactory, IEditorTracker],
  optional: [
    IDocumentManager,
    IDefaultFileBrowser,
    ISettingRegistry,
    ITranslator,
    INotebookTree
  ],
  activate: (
    app: JupyterFrontEnd,
    sanitizer: IRenderMime.ISanitizer,
    factory: IFileBrowserFactory,
    // Request the file editor as we do the replace actions with the editor
    // to take advantage of the editor history.
    editorTracker: IEditorTracker,
    docManager: IDocumentManager | null,
    defaultBrowser: IDefaultFileBrowser | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null,
    notebookTree: INotebookTree | null
  ) => {
    const trans = (translator ?? nullTranslator).load('search_replace');
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
      docManager,
      sanitizer,
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

    // @ts-expect-error the fallback is for JupyterLab 3
    const fileBrowser = defaultBrowser ?? factory.defaultBrowser;
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
    if (notebookTree) {
      searchReplacePlugin.title.label = trans.__('Search');
      notebookTree.addWidget(searchReplacePlugin);
    } else {
      app.shell.add(searchReplacePlugin, 'left');
    }
  }
};

export default plugin;
