import React from 'react';
import { Debouncer } from '@lumino/polling';
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

function createTreeView(results: IResults[]): JSX.Element {
  const items = results.map(file => {
    return (
      <TreeItem className="search-tree-files">
        {file.path}
        <Badge slot="end">{file.matches.length}</Badge>
        {file.matches.map(match => (
          <TreeItem className="search-tree-matches">
            {match.line.slice(0, match.start)}
            <mark>{match.match}</mark>
            {match.line.slice(match.end)}
          </TreeItem>
        ))}
      </TreeItem>
    );
  });

  if (items.length === 0) {
    return <pre>No Matches Found</pre>;
  } else {
    return <TreeView>{items}</TreeView>;
  }
}

//TODO: fix css issue with buttons
export class SearchReplaceView extends VDomRenderer<SearchReplaceModel> {
  constructor(searchModel: SearchReplaceModel) {
    super(searchModel);
    this.addClass('jp-search-replace-tab');
  }

  render(): JSX.Element | null {
    return (
      <>
        <Search
          appearance="outline"
          placeholder="<pre>{matches}</pre>"
          label="Search"
          onInput={(event: any) =>
            (this.model.searchString = event.target.value)
          }
        />
        {createTreeView(this.model.queryResults)}
      </>
    );
  }
}
