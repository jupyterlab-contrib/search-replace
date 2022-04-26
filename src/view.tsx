import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Progress,
  TextField,
  Toolbar,
  TreeItem,
  TreeView
} from '@jupyter-notebook/react-components';
import { Dialog, showDialog, VDomRenderer } from '@jupyterlab/apputils';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import type { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { PathExt } from '@jupyterlab/coreutils';
import type { FileEditor } from '@jupyterlab/fileeditor';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  caretDownIcon,
  caretRightIcon,
  caseSensitiveIcon,
  ellipsesIcon,
  folderIcon,
  refreshIcon,
  regexIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import React, { useEffect, useState } from 'react';
import { AskBoolean } from './askBoolean';
import {
  collapseAllIcon,
  expandAllIcon,
  replaceAllIcon,
  replaceIcon,
  wholeWordIcon
} from './icon';
import { SearchReplaceModel } from './model';
import { SearchReplace } from './tokens';

/**
 * Open a file in JupyterLab
 * @param commands Application commands registry
 * @param path File path
 * @param position Position within the file
 * @returns Widget opened for the given path
 */
async function openFile(
  commands: CommandRegistry,
  path: string,
  position?: { line: number; column: number }
): Promise<IDocumentWidget<FileEditor>> {
  const widget = await commands.execute('docmanager:open', {
    factory: 'Editor',
    path
  });

  if (position) {
    await commands.execute('codemirror:go-to-line', position);
  }

  return widget;
}

/**
 * Replace matches within the editor
 *
 * @param commands Application commands registry
 * @param path File path
 * @param matches Matches to replace
 */
async function replaceInFile(
  commands: CommandRegistry,
  path: string,
  matches: SearchReplace.IReplacement[]
): Promise<IDocumentWidget<FileEditor>> {
  const widget = await openFile(commands, path);
  await widget.context.ready;
  const editor = widget.content.editor as CodeMirrorEditor;

  // Sort from end to start to preserve match positions
  matches
    .sort((a, b) => {
      if (a.line_number < b.line_number) {
        return 1;
      } else if (a.line_number === b.line_number) {
        if (a.start < b.start) {
          return 1;
        } else if (a.start === b.start) {
          return 0;
        } else {
          return -1;
        }
      } else {
        return -1;
      }
    })
    .forEach(m => {
      editor.doc.setSelection(
        {
          line: m.line_number - 1,
          ch: m.start_utf8
        },
        {
          line: m.line_number - 1,
          ch: m.end_utf8
        }
      );
      if (m.replace !== null) {
        editor.doc.replaceSelection(m.replace);
      }
    });

  await commands.execute('docmanager:save');

  return widget;
}

/**
 * Create a tree view for the search query results
 *
 * @param matches Search query results
 * @param path Root directory of the query
 * @param commands Application commands registry
 * @param expandStatus Expansion status of the matches
 * @param maxMatchesPerFiles Maximal number of matches per files
 * @param setExpandStatus Set the matches expansion status
 * @param onReplace Callback on replace event
 * @param trans Extension translation bundle
 * @returns The tree view
 */
function createTreeView(
  matches: SearchReplace.IFileMatch[],
  path: string,
  commands: CommandRegistry,
  expandStatus: boolean[],
  maxMatchesPerFiles: number,
  setExpandStatus: (v: boolean[]) => void,
  onReplace:
    | ((r: SearchReplace.IFileReplacement[], path: string) => void)
    | null,
  trans: TranslationBundle
): JSX.Element {
  matches.sort((a, b) => (a.path > b.path ? 1 : -1));
  const items = matches.map((file, index) => {
    const mayHaveMoreMatches = file.matches.length >= maxMatchesPerFiles;
    return (
      <TreeItem
        className="search-tree-files"
        expanded={expandStatus[index]}
        onClick={() => {
          const expandStatusNew = [...expandStatus];
          expandStatusNew[index] = !expandStatusNew[index];
          setExpandStatus(expandStatusNew);
        }}
      >
        <span title={file.path}>{file.path}</span>
        {onReplace && (
          <Button
            className="jp-search-replace-item-button jp-mod-icon-only"
            appearance="neutral"
            title={trans.__('Replace All in File')}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              const partialResult: SearchReplace.IFileMatch[] = [
                {
                  path: file.path,
                  matches: file.matches
                }
              ];
              onReplace(partialResult, PathExt.join(path, file.path));
            }}
          >
            <replaceAllIcon.react></replaceAllIcon.react>
          </Button>
        )}
        {mayHaveMoreMatches ? (
          <Badge
            slot="end"
            fill={'warning'}
            color={'warning'}
            title={trans.__(
              'Maximal number of matches is reached for this file. You can increase it in the settings.'
            )}
          >
            {file.matches.length}
            {mayHaveMoreMatches && '+'}
          </Badge>
        ) : (
          <Badge slot="end">{file.matches.length}</Badge>
        )}
        {file.matches.map(match => {
          const hasReplace = onReplace && match.replace;
          return (
            <TreeItem
              className="search-tree-matches"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                openFile(commands, PathExt.join(path, file.path));
              }}
            >
              <span title={match.line.trim()}>
                {match.line.slice(0, match.start_utf8)}
                {hasReplace ? (
                  <>
                    <del>{match.match}</del>
                    <ins>{match.replace}</ins>
                  </>
                ) : (
                  <mark>{match.match}</mark>
                )}
                {match.line.slice(match.end_utf8)}
              </span>
              {hasReplace && (
                <Button
                  className="jp-search-replace-item-button jp-mod-icon-only"
                  appearance="neutral"
                  title={trans.__('Replace')}
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    const partialResult: SearchReplace.IFileMatch[] = [
                      {
                        path: file.path,
                        matches: [match]
                      }
                    ];
                    onReplace!(partialResult, PathExt.join(path, file.path));
                  }}
                >
                  <replaceIcon.react></replaceIcon.react>
                </Button>
              )}
            </TreeItem>
          );
        })}
      </TreeItem>
    );
  });

  if (items.length === 0) {
    return <p>{trans.__('No Matches Found')}</p>;
  } else {
    return (
      <div className="jp-search-replace-list">
        <TreeView>{items}</TreeView>
      </div>
    );
  }
}

/**
 * Search and Replace Widget
 */
export class SearchReplaceView extends VDomRenderer<SearchReplaceModel> {
  constructor(
    searchModel: SearchReplaceModel,
    commands: CommandRegistry,
    protected trans: TranslationBundle,
    private onAskReplaceChanged: (b: boolean) => void
  ) {
    super(searchModel);
    this._askReplaceConfirmation = true;
    this._commands = commands;
    this.addClass('jp-search-replace-tab');
    this.addClass('jp-search-replace-column');
  }

  /**
   * Whether to ask confirmation when replacing all matches or not.
   */
  get askReplaceConfirmation(): boolean {
    return this._askReplaceConfirmation;
  }
  set askReplaceConfirmation(v: boolean) {
    if (this._askReplaceConfirmation !== v) {
      this._askReplaceConfirmation = v;
      this.onAskReplaceChanged(v);
    }
  }

  /**
   * Render the widget content
   *
   * @returns The React component
   */
  render(): JSX.Element | null {
    const nFiles = this.model.queryResults.map(r => r.path).length;
    const nMatches = this.model.queryResults.reduce(
      (agg, current) => agg + current.matches.length,
      0
    );

    return (
      <SearchReplaceElement
        searchString={this.model.searchQuery}
        onSearchChanged={(s: string) => {
          this.model.searchQuery = s;
        }}
        replaceString={this.model.replaceString}
        onReplaceString={(s: string) => {
          this.model.replaceString = s;
        }}
        onReplace={async (
          r: SearchReplace.IFileReplacement[],
          filePath?: string
        ) => {
          if (filePath) {
            await replaceInFile(this._commands, filePath, r[0].matches);
            await this.model.refresh();
          } else {
            if (this.askReplaceConfirmation) {
              const result = await showDialog<boolean>({
                title: this.trans.__('Replace All'),
                body: new AskBoolean(
                  this.trans._n(
                    'Replace %2 matche(s) accross %1 file with %3?',
                    'Replace %2 matches accross %1 files with %3?',
                    nFiles,
                    nMatches,
                    this.model.replaceString
                  ),
                  this.trans.__('Skip confirmation next time.')
                ),
                buttons: [
                  Dialog.cancelButton({ label: this.trans.__('Cancel') }),
                  Dialog.okButton({ label: this.trans.__('Replace') })
                ]
              });
              if (!result.button.accept) {
                return;
              } else {
                // If checkbox is checked don't ask for confirmation
                if (result.value === true) {
                  this.askReplaceConfirmation = false;
                }
              }
            }
            await this.model.replace(r);
          }
        }}
        commands={this._commands}
        isLoading={this.model.isLoading}
        queryResults={this.model.queryResults}
        refreshResults={() => {
          this.model.refresh();
        }}
        path={this.model.path}
        onPathChanged={(s: string) => {
          this.model.path = s;
        }}
        maxLinesPerFile={this.model.maxLinesPerFile}
        options={
          <>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Match Case')}
              appearance={this.model.caseSensitive ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.caseSensitive = !this.model.caseSensitive;
              }}
            >
              <caseSensitiveIcon.react></caseSensitiveIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Match Whole Word')}
              appearance={this.model.wholeWord ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.wholeWord = !this.model.wholeWord;
              }}
            >
              <wholeWordIcon.react></wholeWordIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Use Regular Expression')}
              appearance={this.model.useRegex ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.useRegex = !this.model.useRegex;
              }}
            >
              <regexIcon.react></regexIcon.react>
            </Button>
          </>
        }
        trans={this.trans}
      >
        <FilterBox
          includeFilters={this.model.includeFilters}
          excludeFilters={this.model.excludeFilters}
          onIncludeFiltersChange={(f: string) => {
            this.model.includeFilters = f;
          }}
          onExcludeFiltersChange={(v: string) => {
            this.model.excludeFilters = v;
          }}
          trans={this.trans}
        ></FilterBox>

        {this.model.searchQuery && (
          <p className="jp-search-replace-statistics">
            {this.model.queryResults
              ? this.trans._n(
                  '%2 result(s) in %1 file',
                  '%2 results in %1 files',
                  nFiles,
                  nMatches
                )
              : this.trans.__('No results found.')}
          </p>
        )}
      </SearchReplaceElement>
    );
  }

  private _askReplaceConfirmation: boolean;
  private _commands: CommandRegistry;
}

interface IBreadcrumbProps {
  path: string;
  onPathChanged: (s: string) => void;
}

const Breadcrumbs = React.memo((props: IBreadcrumbProps) => {
  const pathItems = props.path.split('/');

  return (
    <Breadcrumb className="jp-search-replace-breadcrumb">
      <BreadcrumbItem
        key="root"
        className="jp-search-replace-breacrumbitem"
        title="/"
      >
        <Button
          className="jp-mod-icon-only"
          appearance="stealth"
          onClick={() => {
            props.onPathChanged('');
          }}
        >
          <folderIcon.react></folderIcon.react>
        </Button>
      </BreadcrumbItem>
      {props.path &&
        pathItems.map((item, index) => {
          const subpath = pathItems.slice(0, index + 1).join('/');
          return (
            <BreadcrumbItem
              key={item}
              className="jp-search-replace-breacrumbitem"
              style={{
                flexGrow: index + 1,
                flexShrink: pathItems.length - index - 1
              }}
              title={'/' + subpath}
            >
              <Button
                className="jp-search-replace-pathbutton"
                appearance="lightweight"
                onClick={() => {
                  props.onPathChanged(subpath);
                }}
              >
                {item}
              </Button>
            </BreadcrumbItem>
          );
        })}
    </Breadcrumb>
  );
});

interface ISearchReplaceProps {
  searchString: string;
  queryResults: SearchReplace.IFileMatch[];
  commands: CommandRegistry;
  isLoading: boolean;
  onSearchChanged: (s: string) => void;
  replaceString: string;
  onReplaceString: (s: string) => void;
  onReplace: (r: SearchReplace.IFileReplacement[], filePath?: string) => void;
  children: React.ReactNode;
  refreshResults: () => void;
  path: string;
  onPathChanged: (s: string) => void;
  maxLinesPerFile: number;
  options: React.ReactNode;
  trans: TranslationBundle;
}

const SearchReplaceElement = (props: ISearchReplaceProps) => {
  const [showReplace, setShowReplace] = useState<boolean>(false);
  const [expandStatus, setExpandStatus] = useState<boolean[]>(
    new Array(props.queryResults.length).fill(true)
  );

  useEffect(() => {
    setExpandStatus(new Array(props.queryResults.length).fill(true));
  }, [props.queryResults]);

  const collapseAll = expandStatus.some(elem => elem);
  const canReplace =
    showReplace && props.replaceString !== '' && props.queryResults.length > 0;

  return (
    <>
      <div className="jp-stack-panel-header">
        <div className="jp-search-replace-header jp-search-replace-row">
          <h2>{props.trans.__('Search')}</h2>
          <div className="jp-Toolbar-spacer"></div>
          <Toolbar>
            <Button
              className="jp-mod-icon-only"
              appearance="stealth"
              title={props.trans.__('Refresh')}
              onClick={() => {
                props.refreshResults();
              }}
            >
              <refreshIcon.react></refreshIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              appearance="stealth"
              title={
                collapseAll
                  ? props.trans.__('Collapse All')
                  : props.trans.__('Expand All')
              }
              disabled={props.queryResults.length === 0}
              onClick={() => {
                const expandStatusNew = new Array(
                  props.queryResults.length
                ).fill(!collapseAll);
                setExpandStatus(expandStatusNew);
              }}
            >
              {collapseAll ? (
                <collapseAllIcon.react></collapseAllIcon.react>
              ) : (
                <expandAllIcon.react></expandAllIcon.react>
              )}
            </Button>
          </Toolbar>
        </div>
        <Breadcrumbs
          path={props.path}
          onPathChanged={props.onPathChanged}
        ></Breadcrumbs>
      </div>
      <div className="jp-search-replace-row jp-search-replace-collapser">
        <Button
          className="jp-mod-icon-only"
          appearance="stealth"
          title={props.trans.__('Toggle Replace')}
          onClick={() => {
            setShowReplace(!showReplace);
          }}
        >
          {showReplace ? (
            <caretDownIcon.react></caretDownIcon.react>
          ) : (
            <caretRightIcon.react></caretRightIcon.react>
          )}
        </Button>
        <div className="jp-search-replace-column">
          <div className="jp-search-replace-row">
            <TextField
              appearance="outline"
              type="text"
              placeholder={props.trans.__('Search')}
              aria-label={props.trans.__('Search Files for Text')}
              onChange={(event: any) => {
                props.onSearchChanged(event.target.value);
              }}
              onInput={(event: any) => {
                props.onSearchChanged(event.target.value);
              }}
              value={props.searchString}
            />
            <Toolbar>{props.options}</Toolbar>
          </div>
          {showReplace && (
            <div className="jp-search-replace-row">
              <TextField
                appearance="outline"
                placeholder={props.trans.__('Replace')}
                onInput={(event: any) => {
                  props.onReplaceString(event.target.value);
                }}
                value={props.replaceString}
              ></TextField>
              <Button
                className="jp-mod-icon-only"
                appearance="stealth"
                title={props.trans.__('Replace All')}
                disabled={!canReplace}
                onClick={() => {
                  props.onReplace(props.queryResults);
                }}
              >
                <replaceAllIcon.react></replaceAllIcon.react>
              </Button>
            </div>
          )}
        </div>
      </div>
      {props.children}
      {props.isLoading ? (
        <Progress />
      ) : (
        props.searchString &&
        createTreeView(
          props.queryResults,
          props.path,
          props.commands,
          expandStatus,
          props.maxLinesPerFile,
          setExpandStatus,
          canReplace ? props.onReplace : null,
          props.trans
        )
      )}
    </>
  );
};

interface IFilterBoxProps {
  includeFilters: string;
  onIncludeFiltersChange: (f: string) => void;
  excludeFilters: string;
  onExcludeFiltersChange: (f: string) => void;
  trans: TranslationBundle;
}

const FilterBox = React.memo((props: IFilterBoxProps) => {
  const [show, setShow] = useState<boolean>(false);
  const {
    includeFilters,
    onIncludeFiltersChange,
    excludeFilters,
    onExcludeFiltersChange,
    trans
  } = props;
  return (
    <div className="jp-search-replace-filtersBox jp-search-replace-column">
      <Button
        className="jp-search-replace-filters-collapser jp-mod-icon-only"
        appearance="stealth"
        title={props.trans.__('Toggle Search Filters')}
        onClick={() => {
          setShow(!show);
        }}
      >
        <ellipsesIcon.react></ellipsesIcon.react>
      </Button>
      {show && (
        <>
          <label className="jp-search-replace-column">
            {trans.__('Include file filters')}
            <TextField
              appearance="outline"
              placeholder={trans.__('e.g. *.py, src/**/include')}
              onChange={(event: any) => {
                onIncludeFiltersChange(event.target.value);
              }}
              onInput={(event: any) => {
                onIncludeFiltersChange(event.target.value);
              }}
              value={includeFilters}
            ></TextField>
          </label>
          <label className="jp-search-replace-column">
            {trans.__('Exclude file filters')}
            <TextField
              appearance="outline"
              placeholder={trans.__('e.g. *.py, src/**/exclude')}
              onChange={(event: any) => {
                onExcludeFiltersChange(event.target.value);
              }}
              onInput={(event: any) => {
                onExcludeFiltersChange(event.target.value);
              }}
              value={excludeFilters}
            ></TextField>
          </label>
        </>
      )}
    </div>
  );
});
