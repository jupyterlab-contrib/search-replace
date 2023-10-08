import { VDomModel } from '@jupyterlab/apputils';
import { JSONExt, PromiseDelegate } from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import { requestAPI } from './handler';
import { SearchReplace } from './tokens';

const REGEXP_GROUP = /\$[1-9]\d*/g;

/**
 * Search and Replace Model
 */
export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._errorMsg = null;
    this._isLoading = false;
    this._searchQuery = '';
    this._queryResults = [];
    this._caseSensitive = false;
    this._wholeWord = false;
    this._useRegex = false;
    this._excludeFilters = '';
    this._includeFilters = '';
    this._path = '';
    this._replaceString = '';
    this._replaceWorker = null;

    this._defaultExcludeFilters = [];
    this._maxLinesPerFile = 100;

    this._debouncedSearch = new Debouncer(async () => {
      await this.search();
    });
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
      this.refresh();
    }
  }

  /**
   * Default exclude filters
   */
  get defaultExcludeFilters(): string[] {
    return this._defaultExcludeFilters;
  }
  set defaultExcludeFilters(v: string[]) {
    if (!JSONExt.deepEqual(v, this._defaultExcludeFilters)) {
      this._defaultExcludeFilters = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Error message if request failed.
   */
  get error(): string | null {
    return this._errorMsg;
  }

  /**
   * Exclude files filters.
   */
  get excludeFilters(): string {
    return this._excludeFilters;
  }

  set excludeFilters(v: string) {
    if (v !== this._excludeFilters) {
      this._excludeFilters = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Include files filters.
   */
  get includeFilters(): string {
    return this._includeFilters;
  }

  set includeFilters(v: string) {
    if (v !== this._includeFilters) {
      this._includeFilters = v;
      this.stateChanged.emit();
      this.refresh();
    }
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
   * Path to apply the search query on.
   */
  get path(): string {
    return this._path;
  }

  set path(v: string) {
    if (v !== this._path) {
      this._path = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Search query results
   */
  get queryResults(): SearchReplace.IFileMatch[] {
    return this._queryResults;
  }

  /**
   * Maximal number of lines with matches per file.
   */
  get maxLinesPerFile(): number {
    return this._maxLinesPerFile;
  }
  set maxLinesPerFile(v: number) {
    if (v >= 1 && v !== this._maxLinesPerFile) {
      this._maxLinesPerFile = v;
      this.stateChanged.emit();
      this.refresh();
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
      this._updateReplace()
        .then(() => {
          this.stateChanged.emit();
        })
        .catch(reason => {
          console.error(`Failed to update replace expression.\n${reason}`);
        });
    }
  }

  /**
   * The search query string
   */
  get searchQuery(): string {
    return this._searchQuery;
  }

  set searchQuery(v: string) {
    if (v !== this._searchQuery) {
      this._searchQuery = v;
      this.stateChanged.emit();
      this.refresh();
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
      this.refresh();
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
      this.refresh();
    }
  }

  /**
   * Refresh the search query.
   */
  refresh(): void {
    this._debouncedSearch
      .invoke()
      .catch(reason => console.error(`Failed to invoke search.\n${reason}`));
  }

  /**
   * Replace some matches
   *
   * @param matches Matches to replace
   */
  async replace(matches: SearchReplace.IFileReplacement[]): Promise<void> {
    try {
      await requestAPI<void>(this.path, {
        method: 'POST',
        body: JSON.stringify({
          matches
        })
      });
      this._errorMsg = null;
    } catch (reason) {
      console.error(`Failed to replace some matches.\n${reason}`);
      this._errorMsg = (reason as Error).message ?? reason;
    } finally {
      this.refresh();
    }
  }

  private async search(): Promise<void> {
    // Ensure values used in error message is coherent with the request
    // as those can change during the server request.
    const search = this.searchQuery;
    const path = this.path;
    if (search === '') {
      this._errorMsg = null;
      this._queryResults = [];
      this.stateChanged.emit();
      return Promise.resolve();
    }
    try {
      this.isLoading = true;
      const queryArgs = [
        ['query', search],
        ['case_sensitive', this.caseSensitive.toString()],
        ['whole_word', this.wholeWord.toString()],
        ['use_regex', this.useRegex.toString()],
        ['max_count', this.maxLinesPerFile.toString()]
      ];

      queryArgs.push(
        ...this.excludeFilters
          .split(',')
          .concat(this.defaultExcludeFilters)
          .map(e => e.trim())
          .filter(e => e)
          .map(e => ['exclude', e])
      );

      queryArgs.push(
        ...this.includeFilters
          .split(',')
          .map(e => e.trim())
          .filter(e => e)
          .map(e => ['include', e])
      );

      const data = await requestAPI<SearchReplace.ISearchQuery>(
        path + '?' + new URLSearchParams(queryArgs).toString(),
        {
          method: 'GET'
        }
      );
      this._queryResults = data.matches;
      this._errorMsg = null;
      if (this.replaceString) {
        await this._updateReplace();
      }
    } catch (reason) {
      console.error(`Failed to search for '${search}' in '${path}'.`, reason);
      this._errorMsg = (reason as Error).message ?? reason;
      this._queryResults = [];
    } finally {
      this._isLoading = false;
      this.stateChanged.emit();
    }
  }

  private async _updateReplace(): Promise<void> {
    const setReplace = (value: string | null = null) => {
      this._queryResults.forEach(f => {
        f.matches.forEach(m => {
          m.replace = value;
        });
      });
    };

    if (this.replaceString.match(REGEXP_GROUP) === null) {
      setReplace(this.replaceString ? this.replaceString : null);
    } else {
      if (!window.Worker) {
        console.error(
          'Failed to build complex replacement expression because your browser does not support WebWorker.'
        );
        setReplace();
      }

      if (this._replaceWorker) {
        this._replaceWorker.terminate();
      }
      this._replaceWorker = new Worker(
        new URL('./regexReplacer.js', (import.meta as any).url)
      );
      const delegate = new PromiseDelegate<void>();

      // Add listeners
      this._replaceWorker.onerror = e => {
        delegate.reject(e);
      };
      this._replaceWorker.onmessage = e => {
        this._queryResults = e.data as SearchReplace.IFileMatch[];
        delegate.resolve();
      };
      this._replaceWorker.postMessage([
        this.searchQuery,
        this.caseSensitive ? '' : 'i',
        this.replaceString,
        this.queryResults
      ]);

      try {
        await delegate.promise;
      } catch (reason) {
        console.error(
          `Failed to build complex replacement expression.\n${reason}`
        );
        setReplace();
      } finally {
        this._replaceWorker.terminate();
        this._replaceWorker = null;
      }
    }
  }

  private _errorMsg: string | null;
  private _isLoading: boolean;
  private _searchQuery: string;
  private _replaceString: string;
  private _caseSensitive: boolean;
  private _wholeWord: boolean;
  private _useRegex: boolean;
  private _excludeFilters: string;
  private _includeFilters: string;
  private _path: string;
  private _queryResults: SearchReplace.IFileMatch[];
  private _debouncedSearch: Debouncer;
  private _replaceWorker: Worker | null;
  // Configuration from settings
  private _defaultExcludeFilters: string[];
  private _maxLinesPerFile: number;
}
