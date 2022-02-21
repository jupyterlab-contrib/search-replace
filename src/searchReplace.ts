import { BoxPanel } from '@lumino/widgets';
import { requestAPI } from './handler';
import { VDomModel } from '@jupyterlab/apputils';

export class SearchReplaceModel extends VDomModel {
  constructor() {
    super();
    this._searchString = '';
  }

  get searchString(): string {
    return this._searchString;
  }

  set searchString(v: string) {
    if (v !== this._searchString) {
      this._searchString = v;
      this.stateChanged.emit();
    }
  }

  async getSearchString(search: string): Promise<void> {
    try {
      const data = await requestAPI<any>(
        '?' + new URLSearchParams([['query', search]]).toString(),
        {
          method: 'GET'
        }
      );
      console.log(data);
    } catch (reason) {
      console.error(
        `The jupyterlab_search_replace server extension appears to be missing.\n${reason}`
      );
    }
  }

  private _searchString: string;
}

//TODO: fix css issue with buttons
export class SearchReplaceView extends BoxPanel {
  constructor(searchModel: SearchReplaceModel) {
    super({ direction: 'top-to-bottom' });
    this.addClass('jp-search-replace-tab');
  }
}
