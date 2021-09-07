import { Widget } from '@lumino/widgets';
import * as rt from 'regular-table';

if (document.createElement('regular-table').constructor === HTMLElement) {
  window.customElements.define('regular-table', rt.RegularTableElement);
}
// const RegularTableElement = customElements.get('regular-table');

export class SearchTable extends Widget {
  constructor() {
    const regularTable = document.createElement('regular-table');
    super({ node: regularTable });
    this._regularTable = regularTable;
    regularTable.setDataListener(dataListener);
    regularTable.addStyleListener(this.styleListener.bind(this));
    regularTable.addEventListener(
      'mousedown',
      this.mousedownListener.bind(this)
    );
    regularTable.addEventListener('scroll', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      regularTable._resetAutoSize();
    });
  }

  update(): void {
    super.update();
    this._regularTable.draw();
  }

  private _regularTable: rt.RegularTableElement;

  get regularTable(): rt.RegularTableElement {
    return this._regularTable;
  }

  styleListener() {
    for (const td of this.regularTable.querySelectorAll('tbody th')) {
      const { y, value } = this.regularTable.getMeta(td as any);
      const { row, is_open } = DATA[y as any];
      const [, type] = row;
      td.classList.toggle('fb-directory', !!value && type === 'directory');
      td.classList.toggle('fb-file', !!value && type === 'file');
      td.classList.toggle('fb-open', !!value && is_open);
    }
  }

  mousedownListener(event: any) {
    if (event.target.tagName === 'TH') {
      const meta = this.regularTable.getMeta(event.target);
      if (DATA[meta.y as any].row[1] === 'directory') {
        // toggleDir(meta.y);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.regularTable._resetAutoSize();
        this.regularTable.draw();
      }
    }
  }
}

function new_path(n: number, name: string): number[] {
  return Array(n).fill('').concat([name]);
}

const COLUMNS = [['size'], ['kind'], ['modified'], ['writable']];
const DATA = Array.from(generateDirContents());

function new_row(type: string) {
  const scale = Math.random() > 0.5 ? 'kb' : 'mb';
  const size = numberFormat(Math.pow(Math.random(), 2) * 1000);
  const date = dateFormat(new Date());
  return [`${size} ${scale}`, type, date, true];
}

function* generateDirContents(n = 0) {
  for (let i = 0; i < 5; i++) {
    yield {
      path: new_path(n, `Dir_${i}`),
      row: new_row('directory'),
      is_open: false
    };
  }
  for (let i = 0; i < 5; i++) {
    yield {
      path: new_path(n, `File_${i}`),
      row: new_row('file')
    };
  }
}

function numberFormat(x: number) {
  const formatter = new Intl.NumberFormat('en-us', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(x);
}
function dateFormat(x: number | Date) {
  const formatter = new Intl.DateTimeFormat('en-us', {
    // week: 'numeric',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  return formatter.format(x);
}

function dataListener(x0: any, y0: any, x1: any, y1: any) {
  return Promise.resolve({
    num_rows: DATA.length as any,
    num_columns: DATA[0].row.length as any,
    row_headers: DATA.slice(y0, y1).map(z => z.path.slice()) as any,
    column_headers: COLUMNS.slice(y0, y1) as any,
    data: transpose(DATA.slice(y0, y1).map(({ row }) => row.slice(x0, x1)))
  });
}

function transpose(m: Array<Array<any>>): string[][] | HTMLElement[][] {
  return m.length === 0
    ? []
    : m[0].map((x: Array<any>, i: number) => m.map(x => x[i]));
}
