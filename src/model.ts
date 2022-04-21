import { VDomModel } from '@jupyterlab/apputils';
import { Debouncer } from '@lumino/polling';
import { requestAPI } from './handler';

export interface IQueryResult {
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
export interface IResults {
  path: string;
  matches: {
    line: string;
    start: number;
    start_utf8: number;
    end: number;
    end_utf8: number;
    match: string;
    line_number: number;
    absolute_offset: number;
  }[];
}

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
