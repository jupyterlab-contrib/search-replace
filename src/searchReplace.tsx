import React from 'react';
import { Debouncer } from '@lumino/polling';
import { CommandRegistry } from '@lumino/commands';
import { requestAPI } from './handler';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import {
  Search,
  TreeView,
  TreeItem,
  Badge,
  Progress,
  Button
} from '@jupyter-notebook/react-components';

export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._isLoading = false;
    this._searchString = '';
    this._queryResults = [];
    this._caseSensitive = false;
    this._wholeWord = false;
    this._useRegex = false;
    this._debouncedStartSearch = new Debouncer(() => {
      this.getSearchString(
        this._searchString,
        this._caseSensitive,
        this._wholeWord,
        this._useRegex
      );
    });
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
      this._debouncedStartSearch
        .invoke()
        .catch(reason =>
          console.error(`failed query for ${v} due to ${reason}`)
        );
    }
  }

  get caseSensitive(): boolean {
    return this._caseSensitive;
  }

  set caseSensitive(v: boolean) {
    this._caseSensitive = v;
    this.stateChanged.emit();
  }

  get wholeWord(): boolean {
    return this._wholeWord;
  }

  set wholeWord(v: boolean) {
    this._wholeWord = v;
    this.stateChanged.emit();
  }

  get useRegex(): boolean {
    return this._useRegex;
  }

  set useRegex(v: boolean) {
    this._useRegex = v;
    this.stateChanged.emit();
  }

  get queryResults(): IResults[] {
    return this._queryResults;
  }

  async getSearchString(
    search: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    useRegex: boolean
  ): Promise<void> {
    try {
      this.isLoading = true;
      const data = await requestAPI<IQueryResult>(
        '?' +
          new URLSearchParams([
            ['query', search],
            ['case_sensitive', caseSensitive.toString()],
            ['whole_word', wholeWord.toString()],
            ['use_regex', useRegex.toString()]
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

  private _isLoading: boolean;
  private _searchString: string;
  private _caseSensitive: boolean;
  private _wholeWord: boolean;
  private _useRegex: boolean;
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

function openFile(path: string, _commands: CommandRegistry) {
  _commands.execute('docmanager:open', { path });
}

function createTreeView(
  results: IResults[],
  _commands: CommandRegistry
): JSX.Element {
  results.sort((a, b) => (a.path > b.path ? 1 : -1));
  const items = results.map(file => {
    return (
      <TreeItem className="search-tree-files" expanded>
        <span title={file.path}>{file.path}</span>
        <Badge slot="end">{file.matches.length}</Badge>
        {file.matches.map(match => (
          <TreeItem
            className="search-tree-matches"
            onClick={() => openFile(file.path, _commands)}
          >
            <span title={match.line}>
              {match.line.slice(0, match.start)}
              <mark>{match.match}</mark>
              {match.line.slice(match.end)}
            </span>
          </TreeItem>
        ))}
      </TreeItem>
    );
  });

  if (items.length === 0) {
    return <p>No Matches Found</p>;
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

  constructor(searchModel: SearchReplaceModel, commands: CommandRegistry) {
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
        commands={this._commands}
        isLoading={this.model.isLoading}
        queryResults={this.model.queryResults}
      >
        <Button
          appearance={this.model.caseSensitive === true ? 'accent' : 'neutral'}
          onClick={() => {
            this.model.caseSensitive = !this.model.caseSensitive;
          }}
        >
          Case Sensitive
        </Button>
        <Button
          appearance={this.model.wholeWord === true ? 'accent' : 'neutral'}
          onClick={() => {
            this.model.wholeWord = !this.model.wholeWord;
          }}
        >
          Whole World
        </Button>
        <Button
          appearance={this.model.useRegex === true ? 'accent' : 'neutral'}
          onClick={() => {
            this.model.useRegex = !this.model.useRegex;
          }}
        >
          Use Regex
        </Button>
      </SearchReplaceElement>
    );
  }
}

const SearchReplaceElement = (props: any) => {
  return (
    <>
      <Search
        appearance="outline"
        placeholder="Search"
        aria-label="Search files for text"
        onInput={(event: any) => {
          props.onSearchChanged(event.target.value);
        }}
      />
      {props.children}
      {props.isLoading ? (
        <Progress />
      ) : (
        props.searchString && createTreeView(props.queryResults, props.commands)
      )}
    </>
  );
};
