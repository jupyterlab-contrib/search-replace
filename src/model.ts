import { VDomModel } from '@jupyterlab/apputils';
import { PromiseDelegate } from '@lumino/coreutils';
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
    this._isLoading = false;
    this._searchQuery = '';
    this._queryResults = [];
    this._caseSensitive = false;
    this._wholeWord = false;
    this._useRegex = false;
    this._filesFilter = '';
    this._excludeToggle = false;
    this._path = '';
    this._replaceString = '';
    this._debouncedSearch = new Debouncer(async () => {
      await this.search(
        this._searchQuery,
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
   * Whether the files filter is to exclude or include files.
   */
  get excludeToggle(): boolean {
    return this._excludeToggle;
  }

  set excludeToggle(v: boolean) {
    if (v !== this._excludeToggle) {
      this._excludeToggle = v;
      this.stateChanged.emit();
      this.refresh();
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
    } catch (reason) {
      console.error(`Failed to replace some matches.\n${reason}`);
    } finally {
      this.refresh();
    }
  }

  private async search(
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
      const data = await requestAPI<SearchReplace.ISearchQuery>(
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
      if (this.replaceString) {
        await this._updateReplace();
      }
    } catch (reason) {
      console.error(`Failed to search for '${search}' in '${path}'.`, reason);
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

  private _isLoading: boolean;
  private _searchQuery: string;
  private _replaceString: string;
  private _caseSensitive: boolean;
  private _wholeWord: boolean;
  private _useRegex: boolean;
  private _filesFilter: string;
  private _excludeToggle: boolean;
  private _path: string;
  private _queryResults: SearchReplace.IFileMatch[];
  private _debouncedSearch: Debouncer;
  private _replaceWorker: Worker | null = null;
}
