import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Progress,
  Search,
  Switch,
  TextField,
  Toolbar,
  TreeItem,
  TreeView
} from '@jupyter-notebook/react-components';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  caseSensitiveIcon,
  folderIcon,
  refreshIcon,
  regexIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Debouncer } from '@lumino/polling';
import React, { useEffect, useState } from 'react';
import { requestAPI } from './handler';
import {
  collapseAllIcon,
  expandAllIcon,
  replaceAllIcon,
  replaceIcon,
  wholeWordIcon
} from './icon';

export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._isLoading = false;
    this._searchString = '';
    this._queryResults = [];
    this._caseSensitive = false;
    this._wholeWord = false;
    this._useRegex = false;
    this._filesFilter = '';
    this._excludeToggle = false;
    this._path = '';
    this._replaceString = '';
    this._debouncedStartSearch = new Debouncer(() => {
      this.getSearchString(
        this._searchString,
        this._caseSensitive,
        this._wholeWord,
        this._useRegex,
        this._filesFilter,
        this._excludeToggle,
        this._path
      );
    });
  }

  refreshResults(): void {
    this._debouncedStartSearch
      .invoke()
      .catch(reason => console.error(`failed query for due to ${reason}`));
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  set isLoading(v: boolean) {
    if (v !== this._isLoading) {
      this._isLoading = v;
      this.stateChanged.emit();
    }
  }

  get searchString(): string {
    return this._searchString;
  }

  set searchString(v: string) {
    if (v !== this._searchString) {
      this._searchString = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get caseSensitive(): boolean {
    return this._caseSensitive;
  }

  set caseSensitive(v: boolean) {
    if (v !== this._caseSensitive) {
      this._caseSensitive = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get wholeWord(): boolean {
    return this._wholeWord;
  }

  set wholeWord(v: boolean) {
    if (v !== this._wholeWord) {
      this._wholeWord = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get useRegex(): boolean {
    return this._useRegex;
  }

  set useRegex(v: boolean) {
    if (v !== this._useRegex) {
      this._useRegex = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get filesFilter(): string {
    return this._filesFilter;
  }

  set filesFilter(v: string) {
    if (v !== this._filesFilter) {
      this._filesFilter = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get excludeToggle(): boolean {
    return this._excludeToggle;
  }

  set excludeToggle(v: boolean) {
    if (v !== this._excludeToggle) {
      this._excludeToggle = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get queryResults(): IResults[] {
    return this._queryResults;
  }

  get path(): string {
    return this._path;
  }

  set path(v: string) {
    if (v !== this._path) {
      this._path = v;
      this.stateChanged.emit();
      this.refreshResults();
    }
  }

  get replaceString(): string {
    return this._replaceString;
  }

  set replaceString(v: string) {
    if (v !== this._replaceString) {
      this._replaceString = v;
      this.stateChanged.emit();
    }
  }

  private async getSearchString(
    search: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    useRegex: boolean,
    includeFiles: string,
    excludeToggle: boolean,
    path: string
  ): Promise<void> {
    if (search === '') {
      this._queryResults = [];
      this.stateChanged.emit();
      return Promise.resolve();
    }
    try {
      this.isLoading = true;
      let excludeFiles = '';
      if (excludeToggle) {
        excludeFiles = includeFiles;
        includeFiles = '';
      }
      const data = await requestAPI<IQueryResult>(
        path +
          '?' +
          new URLSearchParams([
            ['query', search],
            ['case_sensitive', caseSensitive.toString()],
            ['whole_word', wholeWord.toString()],
            ['use_regex', useRegex.toString()],
            ['include', includeFiles],
            ['exclude', excludeFiles]
          ]).toString(),
        {
          method: 'GET'
        }
      );
      this._queryResults = data.matches;
      this.stateChanged.emit();
    } catch (reason) {
      console.error(
        `The jupyterlab_search_replace server extension appears to be missing.\n${reason}`
      );
    } finally {
      this.isLoading = false;
    }
  }

  async postReplaceString(results: IResults[]): Promise<void> {
    try {
      await requestAPI<void>(this.path, {
        method: 'POST',
        body: JSON.stringify({
          results,
          query: this.replaceString
        })
      });
    } catch (reason) {
      console.error(
        `The jupyterlab_search_replace server extension appears to be missing.\n${reason}`
      );
    } finally {
      this.refreshResults();
    }
  }

  private _isLoading: boolean;
  private _searchString: string;
  private _replaceString: string;
  private _caseSensitive: boolean;
  private _wholeWord: boolean;
  private _useRegex: boolean;
  private _filesFilter: string;
  private _excludeToggle: boolean;
  private _path: string;
  private _queryResults: IResults[];
  private _debouncedStartSearch: Debouncer;
}

interface IQueryResult {
  matches: IResults[];
}

/**
 * Interface to represent matches in a file
 * @interface IResults
 * @member path -- path of file
 * @member matches -- all matches within that file
 * @field line -- line containing the match
 * @field start -- starting offset of the match
 * @field end -- ending offset of the match
 * @field match -- the actual match itself
 * @field line_number -- the line number where the match occurs
 * @field absolute_offset -- the offset from the beginning of file
 */
interface IResults {
  path: string;
  matches: {
    line: string;
    start: number;
    end: number;
    match: string;
    line_number: number;
    absolute_offset: number;
  }[];
}

function openFile(prefixDir: string, path: string, _commands: CommandRegistry) {
  _commands.execute('docmanager:open', { path: PathExt.join(prefixDir, path) });
}

function createTreeView(
  results: IResults[],
  path: string,
  _commands: CommandRegistry,
  expandStatus: boolean[],
  setExpandStatus: (v: boolean[]) => void,
  onReplace: (r: IResults[]) => void,
  trans: TranslationBundle
): JSX.Element {
  results.sort((a, b) => (a.path > b.path ? 1 : -1));
  const items = results.map((file, index) => {
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
        <Button
          title={trans.__('Replace All in File')}
          onClick={() => {
            const partialResult: IResults[] = [
              {
                path: file.path,
                matches: file.matches
              }
            ];
            onReplace(partialResult);
          }}
        >
          <replaceAllIcon.react></replaceAllIcon.react>
        </Button>
        <Badge slot="end">{file.matches.length}</Badge>
        {file.matches.map(match => (
          <TreeItem
            className="search-tree-matches"
            onClick={(event: React.MouseEvent) => {
              openFile(path, file.path, _commands);
              event.stopPropagation();
            }}
          >
            <span title={match.line}>
              {match.line.slice(0, match.start)}
              <mark>{match.match}</mark>
              {match.line.slice(match.end)}
            </span>
            <Button
              title={trans.__('Replace')}
              onClick={() => {
                const partialResult: IResults[] = [
                  {
                    path: file.path,
                    matches: [match]
                  }
                ];
                onReplace(partialResult);
              }}
            >
              <replaceIcon.react></replaceIcon.react>
            </Button>
          </TreeItem>
        ))}
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

//TODO: fix css issue with buttons
export class SearchReplaceView extends VDomRenderer<SearchReplaceModel> {
  private _commands: CommandRegistry;

  constructor(
    searchModel: SearchReplaceModel,
    commands: CommandRegistry,
    protected trans: TranslationBundle
  ) {
    super(searchModel);
    this._commands = commands;
    this.addClass('jp-search-replace-tab');
  }

  render(): JSX.Element | null {
    return (
      <SearchReplaceElement
        searchString={this.model.searchString}
        onSearchChanged={(s: string) => {
          this.model.searchString = s;
        }}
        replaceString={this.model.replaceString}
        onReplaceString={(s: string) => {
          this.model.replaceString = s;
        }}
        onReplace={(r: IResults[]) => {
          this.model.postReplaceString(r);
        }}
        commands={this._commands}
        isLoading={this.model.isLoading}
        queryResults={this.model.queryResults}
        refreshResults={() => {
          this.model.refreshResults();
        }}
        path={this.model.path}
        onPathChanged={(s: string) => {
          this.model.path = s;
        }}
        options={
          <>
            <Button
              title={this.trans.__('Match Case')}
              appearance={this.model.caseSensitive ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.caseSensitive = !this.model.caseSensitive;
              }}
            >
              <caseSensitiveIcon.react></caseSensitiveIcon.react>
            </Button>
            <Button
              title={this.trans.__('Match Whole Word')}
              appearance={this.model.wholeWord ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.wholeWord = !this.model.wholeWord;
              }}
            >
              <wholeWordIcon.react></wholeWordIcon.react>
            </Button>
            <Button
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
        <TextField
          appearance="outline"
          placeholder={this.trans.__('Files filter')}
          onInput={(event: any) => {
            this.model.filesFilter = event.target.value;
          }}
          value={this.model.filesFilter}
        >
          {this.trans.__('File filters')}
        </TextField>
        <Switch
          title={this.trans.__('Toggle File Filter Mode')}
          onChange={(event: any) => {
            this.model.excludeToggle = event.target.checked;
          }}
          checked={this.model.excludeToggle}
        >
          <span slot="checked-message">
            {this.trans.__('Files to Exclude')}
          </span>
          <span slot="unchecked-message">
            {this.trans.__('Files to Include')}
          </span>
        </Switch>
      </SearchReplaceElement>
    );
  }
}

interface ISearchReplaceProps {
  searchString: string;
  queryResults: IResults[];
  commands: CommandRegistry;
  isLoading: boolean;
  onSearchChanged: (s: string) => void;
  replaceString: string;
  onReplaceString: (s: string) => void;
  onReplace: (r: IResults[]) => void;
  children: React.ReactNode;
  refreshResults: () => void;
  path: string;
  onPathChanged: (s: string) => void;
  options: React.ReactNode;
  trans: TranslationBundle;
}

interface IBreadcrumbProps {
  path: string;
  onPathChanged: (s: string) => void;
}

const Breadcrumbs = (props: IBreadcrumbProps) => {
  const pathItems = props.path.split('/');
  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Button
          onClick={() => {
            props.onPathChanged('');
          }}
        >
          <folderIcon.react></folderIcon.react>
        </Button>
      </BreadcrumbItem>
      {props.path &&
        pathItems.map((item, index) => {
          return (
            <BreadcrumbItem>
              <Button
                appearance="lightweight"
                onClick={() => {
                  props.onPathChanged(pathItems.slice(0, index + 1).join('/'));
                }}
              >
                {item}
              </Button>
            </BreadcrumbItem>
          );
        })}
    </Breadcrumb>
  );
};

const SearchReplaceElement = (props: ISearchReplaceProps) => {
  const [expandStatus, setExpandStatus] = useState<boolean[]>(
    new Array(props.queryResults.length).fill(true)
  );

  useEffect(() => {
    setExpandStatus(new Array(props.queryResults.length).fill(true));
  }, [props.queryResults]);

  const collapseAll = expandStatus.some(elem => elem);

  return (
    <>
      <div className="search-title-with-refresh">
        <h2>{props.trans.__('Search')}</h2>
        <Button
          title={props.trans.__('Refresh')}
          onClick={() => {
            props.refreshResults();
          }}
        >
          <refreshIcon.react></refreshIcon.react>
        </Button>
        <Button
          title={
            collapseAll
              ? props.trans.__('Collapse All')
              : props.trans.__('Expand All')
          }
          disabled={props.queryResults.length === 0}
          onClick={() => {
            const expandStatusNew = new Array(props.queryResults.length).fill(
              !collapseAll
            );
            setExpandStatus(expandStatusNew);
          }}
        >
          {collapseAll ? (
            <collapseAllIcon.react></collapseAllIcon.react>
          ) : (
            <expandAllIcon.react></expandAllIcon.react>
          )}
        </Button>
      </div>
      <div className="breadcrumb-folder-paths">
        <Breadcrumbs
          path={props.path}
          onPathChanged={props.onPathChanged}
        ></Breadcrumbs>
      </div>
      <div className="search-bar-with-options">
        <Search
          appearance="outline"
          placeholder={props.trans.__('Search')}
          aria-label={props.trans.__('Search Files for Text')}
          onInput={(event: any) => {
            props.onSearchChanged(event.target.value);
          }}
          value={props.searchString}
        />
        <Toolbar>{props.options}</Toolbar>
      </div>
      <div className="replace-bar-with-button">
        <TextField
          appearance="outline"
          placeholder={props.trans.__('Replace')}
          onInput={(event: any) => {
            props.onReplaceString(event.target.value);
          }}
          value={props.replaceString}
        ></TextField>
        <Button
          title={props.trans.__('Replace All')}
          onClick={() => {
            props.onReplace(props.queryResults);
          }}
        >
          <replaceAllIcon.react></replaceAllIcon.react>
        </Button>
      </div>
      <div>{props.children}</div>
      {props.isLoading ? (
        <Progress />
      ) : (
        props.searchString &&
        createTreeView(
          props.queryResults,
          props.path,
          props.commands,
          expandStatus,
          setExpandStatus,
          props.onReplace,
          props.trans
        )
      )}
    </>
  );
};
