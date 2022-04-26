import { Dialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

/**
 * Ask the user with remember the choice option
 */
export class AskBoolean extends Widget implements Dialog.IBodyWidget<boolean> {
  constructor(content: string, checkboxLabel: string) {
    super({ node: AskBoolean.createNode(content, checkboxLabel) });
    this._checkbox = this.node.querySelector<HTMLInputElement>(
      '.jp-ask-checkbox > input[type="checkbox"]'
    )!;
  }

  /**
   * Returns the remember this choice checkbox value.
   */
  getValue(): boolean {
    return this._checkbox.checked;
  }

  static createNode(content: string, checkboxLabel: string): HTMLElement {
    const node = document.createElement('div');
    node.insertAdjacentHTML(
      'afterbegin',
      `<div><p>${content}</p></div>
      <label class="jp-ask-checkbox"><input type="checkbox"></input>${checkboxLabel}</label>`
    );
    return node;
  }

  private _checkbox: HTMLInputElement;
}
