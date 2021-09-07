import { BoxPanel } from '@lumino/widgets';
import { createSearchEntry } from './searchoverlay';
import { SearchTable } from './searchTable';
import { requestAPI } from './handler';

export class SearchReplaceModel {
  constructor() {
    this._searchString = '';
  }
  _searchString: string;

  async getSearchString(search: string): Promise<void> {
    try {
      const data = await requestAPI<any>('get_search_string', {
        body: JSON.stringify({ search }),
        method: 'POST'
      });
      console.log(data);
    } catch (reason) {
      console.error(
        `The search_replace server extension appears to be missing.\n${reason}`
      );
    }
  }
}

//TODO: fix css issue with buttons
export class SearchReplaceView extends BoxPanel {
  constructor() {
    super({ direction: 'top-to-bottom' });
    this.addWidget(createSearchEntry());
    const searchTable = new SearchTable();
    this.addWidget(searchTable);
    this.addClass('jp-search-replace-tab');
    // this.node.appendChild(document.createElement('div'));
  }
}
