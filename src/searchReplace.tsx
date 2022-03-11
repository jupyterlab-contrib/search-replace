import React from 'react';
import { Debouncer } from '@lumino/polling';
import { CommandRegistry } from '@lumino/commands';
import { requestAPI } from './handler';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import {
  Search,
  TreeView,
  TreeItem,
  Badge
} from '@jupyter-notebook/react-components';

export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._searchString = '';
    this._queryResults = [];
    this._debouncedStartSearch = new Debouncer(() => {
      this.getSearchString(this._searchString);
    });
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

  get queryResults(): IResults[] {
    return this._queryResults;
  }

  async getSearchString(search: string): Promise<void> {
    try {
      const data = await requestAPI<IQueryResult>(
        '?' + new URLSearchParams([['query', search]]).toString(),
        {
          method: 'GET'
        }
      );
      this._queryResults = data.matches;
      this.stateChanged.emit();
      console.log(data);
    } catch (reason) {
      console.error(
        `The jupyterlab_search_replace server extension appears to be missing.\n${reason}`
      );
    }
  }

  private _searchString: string;
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
  // _commands.execute('')
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
      <>
        <Search
          appearance="outline"
          placeholder="Search"
          aria-label="Search files for text"
          onInput={(event: any) =>
            (this.model.searchString = event.target.value)
          }
        />
        {this.model.searchString &&
          createTreeView(this.model.queryResults, this._commands)}
      </>
    );
  }
}
