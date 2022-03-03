import React from 'react';
import { Debouncer } from '@lumino/polling';
import { requestAPI } from './handler';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { Search } from '@jupyter-notebook/react-components'

export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._searchString = '';
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
      this._debouncedStartSearch.invoke().catch((reason)=>
        console.error(`failed query for ${v} due to ${reason}`)
      )
    }
  }

  get queryResults(): string {
    return this._queryResults;
  }

  async getSearchString(search: string): Promise<void> {
    try {
      const data = await requestAPI<any>(
        '?' + new URLSearchParams([['query', search] ]).toString(),
        {
          method: 'GET'
        }
      );
      this._queryResults = data;
      this.stateChanged.emit();
      console.log(data);
    } catch (reason) {
      console.error(
        `The jupyterlab_search_replace server extension appears to be missing.\n${reason}`
      );
    }
  }

  private _searchString: string;
  private _queryResults: any;
  private _debouncedStartSearch: Debouncer;
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
            label='Search'
            onInput={(event: any)=> this.model.searchString = event.target.value}
          />
          <pre>{JSON.stringify(this.model.queryResults, undefined, 4)}</pre>
        </>
      );
  }
}
