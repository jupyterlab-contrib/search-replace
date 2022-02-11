import { BoxPanel } from '@lumino/widgets';
import { SearchReplaceInputs } from './searchoverlay';
import { requestAPI } from './handler';
import { TreeTableModel, TreeTableView } from './treetable';
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

  private _searchString: string;
}

//TODO: fix css issue with buttons
export class SearchReplaceView extends BoxPanel {
  constructor(searchModel: SearchReplaceModel) {
    super({ direction: 'top-to-bottom' });
    this.addWidget(new SearchReplaceInputs(searchModel));
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
