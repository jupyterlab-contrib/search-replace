import { VDomModel } from '@jupyterlab/apputils';
import { Debouncer } from '@lumino/polling';
import { requestAPI } from './handler';

/**
 * Search query results
 */
export interface IQueryResult {
  /**
   * Matches per file
   */
  matches: IResults[];
}

/**
 * Interface to represent matches in a file
 */
export interface IResults {
  /**
   * path of file
   */
  path: string;
  /**
   * all matches within that file
   */
  matches: {
    /**
     * line containing the match
     */
    line: string;
    /**
     * starting offset of the match in binary format
     */
    start: number;
    /**
     * starting offset of the match in utf-8 format
     */
    start_utf8: number;
    /**
     * ending offset of the match in binary format
     */
    end: number;
    /**
     * ending offset of the match in utf-8 format
     */
    end_utf8: number;
    /**
     * the actual match itself
     */
    match: string;
    /**
     * the line number where the match occurs
     */
    line_number: number;
    /**
     * the offset from the beginning of file
     */
    absolute_offset: number;
  }[];
}

/**
 * Search and Replace Model
 */
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

  /**
   * Refresh the search query.
   */
  refreshResults(): void {
    this._debouncedStartSearch
      .invoke()
      .catch(reason => console.error(`failed query for due to ${reason}`));
  }

  /**
   * Whether a search query is happening or not
   */
  get isLoading(): boolean {
    return this._isLoading;
  }

  set isLoading(v: boolean) {
    if (v !== this._isLoading) {
      this._isLoading = v;
      this.stateChanged.emit();
    }
  }

  /**
   * The search query string
   */
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

  /**
   * Whether the search query is case sensitive or not.
   */
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

  /**
   * Whether the search query is for whole words only or not.
   */
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

  /**
   * Whether the search query is a regular expression or not.
   */
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

  /**
   * Files filter.
   */
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

  /**
   * Whether the files filter is to exclude or include files.
   */
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

  /**
   * Search query results
   */
  get queryResults(): IResults[] {
    return this._queryResults;
  }

  /**
   * Path to apply the search query on.
   */
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

  /**
   * Replace string
   */
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

  /**
   * Replace some matches
   *
   * @param matches Matches to replace
   */
  async replace(matches: IResults[]): Promise<void> {
    try {
      await requestAPI<void>(this.path, {
        method: 'POST',
        body: JSON.stringify({
          results: matches,
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
