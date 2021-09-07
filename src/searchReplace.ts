import { Widget } from '@lumino/widgets';

export class SearchReplaceModel {}

export class SearchReplaceView extends Widget {
  constructor() {
    super({ node: document.createElement('div') });
    this.addClass('jp-search-replace-tab');
  }
}
