import { BoxPanel } from '@lumino/widgets';
import { createSearchEntry } from './searchoverlay';
import { requestAPI } from './handler';
import { TreeTableModel, TreeTableView } from './treetable';

export class SearchReplaceModel {
  constructor() {
    this._searchString = '';
  }

  async getSearchString(search: string): Promise<void> {
    try {
      const data = await requestAPI<any>(
        '?' + new URLSearchParams([['regex', search]]).toString(),
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
  _searchString: string;
}

//TODO: fix css issue with buttons
export class SearchReplaceView extends BoxPanel {
  constructor() {
    super({ direction: 'top-to-bottom' });
    this.addWidget(createSearchEntry());
    const model = new TreeTableModel({
      dataListener: (x0, x1, y0, y1) =>
        Promise.resolve({
          num_rows: 0,
          num_columns: 0,
          column_headers: [['A']],
          row_headers: [['1']],
          data: [['22']]
        })
    });
    const searchTable = new TreeTableView({ model });
    this.addWidget(searchTable);
    this.addClass('jp-search-replace-tab');
  }
}
