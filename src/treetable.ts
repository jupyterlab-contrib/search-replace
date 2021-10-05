import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import * as rt from 'regular-table';

if (document.createElement('regular-table').constructor === HTMLElement) {
  window.customElements.define('regular-table', rt.RegularTableElement);
}

export class TreeTableModel implements TreeTable.IModel {
  constructor(options: TreeTable.IOptions) {
    this._dataListener = options.dataListener;
    this._styleListener = options.styleListener;
    this._eventListeners = options.eventListeners ?? [];
  }

  get dataListener(): TreeTable.DataListener {
    return this._dataListener;
  }

  get styleListener(): TreeTable.StyleListener | undefined {
    return this._styleListener;
  }

  get eventListeners(): TreeTable.EventListener[] {
    return this._eventListeners;
  }

  private _dataListener: TreeTable.DataListener;
  private _styleListener: TreeTable.StyleListener | undefined;
  private _eventListeners: TreeTable.EventListener[];
}

export class TreeTableView extends Widget {
  constructor(options: TreeTable.IViewOptions) {
    super(options);
    this.model = options.model;
    const table = (this.table = document.createElement('regular-table'));
    table.setDataListener(this.model.dataListener);
    this.node.appendChild(table);
  }

  notifyLayout(msg: Message): void {
    super.notifyLayout(msg);
    this.table.draw();
  }

  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (!this._style_set) {
      this.table.addStyleListener(
        (arg: { detail: rt.RegularTableElement }): void => {
          const tableElement = this.table.querySelector('table');
          if (tableElement) {
            tableElement.style.width = '100%';
          }
          this.model.styleListener?.call(this, arg);
        }
      );

      this._style_set = true;
    }
  }

  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
  }

  protected model: TreeTable.IModel;
  protected table: rt.RegularTableElement;
  private _style_set = false;
}

export namespace TreeTable {
  export type DataListener = rt.DataListener;

  export type DataResponse = rt.DataResponse;

  export type StyleListener = (arg: { detail: rt.RegularTableElement }) => void;

  export type EventListener = [
    string,
    (event: Event) => void,
    boolean | EventListenerOptions | undefined
  ];

  export interface IOptions {
    dataListener: DataListener;
    styleListener?: StyleListener;
    eventListeners?: EventListener[];
  }

  export interface IModel {
    dataListener: DataListener;
    styleListener?: StyleListener;
    eventListeners: EventListener[];
  }

  export interface IViewOptions extends Widget.IOptions {
    model: IModel;
  }
}
