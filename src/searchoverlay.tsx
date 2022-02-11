// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomRenderer } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  caretDownEmptyThinIcon,
  caretUpEmptyThinIcon,
  caseSensitiveIcon,
  classes,
  ellipsesIcon,
  regexIcon
} from '@jupyterlab/ui-components';
import * as React from 'react';
import { SearchReplaceModel } from './searchReplace';

const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const INPUT_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off';
const INPUT_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_DOWN_BUTTON_CLASS = 'jp-DocumentSearch-up-down-button';
const ELLIPSES_BUTTON_CLASS = 'jp-DocumentSearch-ellipses-button';
const ELLIPSES_BUTTON_ENABLED_CLASS =
  'jp-DocumentSearch-ellipses-button-enabled';
const SEARCH_OPTIONS_CLASS = 'jp-DocumentSearch-search-options';
const SEARCH_OPTIONS_DISABLED_CLASS =
  'jp-DocumentSearch-search-options-disabled';
const REPLACE_ENTRY_CLASS = 'jp-DocumentSearch-replace-entry';
const REPLACE_BUTTON_CLASS = 'jp-DocumentSearch-replace-button';
const REPLACE_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-replace-button-wrapper';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';
const FOCUSED_INPUT = 'jp-DocumentSearch-focused-input';
const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';

export class SearchReplaceInputs extends VDomRenderer<SearchReplaceModel> {
  render(): JSX.Element {
    return (
      <SearchEntry
        onCaseSensitiveToggled={() => void 0}
        onRegexToggled={() => void 0}
        onKeydown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          this.model.searchString = (e.target as HTMLInputElement).value;
        }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          this.model.searchString = e.target.value;
        }}
        onInputFocus={() => void 0}
        onInputBlur={() => void 0}
        inputFocused={false}
        caseSensitive={false}
        useRegex={false}
        searchText={this.model.searchString}
        forceFocus={false}
      />
    );
  }
}

interface ISearchEntryProps {
  onCaseSensitiveToggled: () => void;
  onRegexToggled: () => void;
  onKeydown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  inputFocused: boolean;
  caseSensitive: boolean;
  useRegex: boolean;
  searchText: string;
  forceFocus: boolean;
  translator?: ITranslator;
}

interface IReplaceEntryProps {
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onReplaceKeydown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  replaceText: string;
  translator?: ITranslator;
}

export class SearchEntry extends React.Component<ISearchEntryProps> {
  constructor(props: ISearchEntryProps) {
    super(props);
    this.translator = props.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.searchInputRef = React.createRef();
  }

  /**
   * Focus the input.
   */
  focusInput() {
    // Select (and focus) any text already present.
    // This makes typing in the box starts a new query (the common case),
    // while arrow keys can be used to move cursor in preparation for
    // modifying previous query.
    this.searchInputRef.current?.select();
  }

  componentDidUpdate() {
    if (this.props.forceFocus) {
      this.focusInput();
    }
  }

  render() {
    const caseButtonToggleClass = classes(
      this.props.caseSensitive ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
      BUTTON_CONTENT_CLASS
    );
    const regexButtonToggleClass = classes(
      this.props.useRegex ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
      BUTTON_CONTENT_CLASS
    );

    const wrapperClass = `${INPUT_WRAPPER_CLASS} ${
      this.props.inputFocused ? FOCUSED_INPUT : ''
    }`;

    return (
      <div className={wrapperClass}>
        <input
          placeholder={
            this.props.searchText ? undefined : this._trans.__('Find')
          }
          className={INPUT_CLASS}
          value={this.props.searchText}
          onChange={e => this.props.onChange(e)}
          onKeyDown={e => this.props.onKeydown(e)}
          tabIndex={0}
          onFocus={e => this.props.onInputFocus()}
          onBlur={e => this.props.onInputBlur()}
          ref={this.searchInputRef}
        />
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onCaseSensitiveToggled()}
          tabIndex={0}
        >
          <caseSensitiveIcon.react
            className={caseButtonToggleClass}
            tag="span"
          />
        </button>
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onRegexToggled()}
          tabIndex={0}
        >
          <regexIcon.react className={regexButtonToggleClass} tag="span" />
        </button>
      </div>
    );
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private searchInputRef: React.RefObject<HTMLInputElement>;
}

export class ReplaceEntry extends React.Component<IReplaceEntryProps> {
  constructor(props: any) {
    super(props);
    this._trans = (props.translator || nullTranslator).load('jupyterlab');
    this.replaceInputRef = React.createRef();
  }

  render() {
    return (
      <div className={REPLACE_WRAPPER_CLASS}>
        <input
          placeholder={
            this.props.replaceText ? undefined : this._trans.__('Replace')
          }
          className={REPLACE_ENTRY_CLASS}
          value={this.props.replaceText}
          onKeyDown={e => this.props.onReplaceKeydown(e)}
          onChange={e => this.props.onChange(e)}
          tabIndex={0}
          ref={this.replaceInputRef}
        />
        <button
          className={REPLACE_BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onReplaceCurrent()}
          tabIndex={0}
        >
          <span
            className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={0}
          >
            {this._trans.__('Replace')}
          </span>
        </button>
        <button
          className={REPLACE_BUTTON_WRAPPER_CLASS}
          tabIndex={0}
          onClick={() => this.props.onReplaceAll()}
        >
          <span
            className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          >
            {this._trans.__('Replace All')}
          </span>
        </button>
      </div>
    );
  }

  private replaceInputRef: React.RefObject<HTMLInputElement>;
  private _trans: TranslationBundle;
}

interface IUpDownProps {
  onHighlightPrevious: () => void;
  onHighlightNext: () => void;
}

export function UpDownButtons(props: IUpDownProps) {
  return (
    <div className={UP_DOWN_BUTTON_WRAPPER_CLASS}>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHighlightPrevious()}
        tabIndex={0}
      >
        <caretUpEmptyThinIcon.react
          className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
          tag="span"
        />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHighlightNext()}
        tabIndex={0}
      >
        <caretDownEmptyThinIcon.react
          className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
          tag="span"
        />
      </button>
    </div>
  );
}

interface ISearchIndexProps {
  currentIndex: number | null;
  totalMatches: number;
}

export function SearchIndices(props: ISearchIndexProps) {
  return (
    <div className={INDEX_COUNTER_CLASS}>
      {props.totalMatches === 0
        ? '-/-'
        : `${props.currentIndex === null ? '-' : props.currentIndex + 1}/${
            props.totalMatches
          }`}
    </div>
  );
}

interface IFilterToggleProps {
  enabled: boolean;
  toggleEnabled: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IFilterToggleState {}

export class FilterToggle extends React.Component<
  IFilterToggleProps,
  IFilterToggleState
> {
  render() {
    let className = `${ELLIPSES_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`;
    if (this.props.enabled) {
      className = `${className} ${ELLIPSES_BUTTON_ENABLED_CLASS}`;
    }
    return (
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => this.props.toggleEnabled()}
        tabIndex={0}
      >
        <ellipsesIcon.react
          className={className}
          tag="span"
          height="20px"
          width="20px"
        />
      </button>
    );
  }
}

interface IFilterSelectionProps {
  searchOutput: boolean;
  searchSelectedCells: boolean;
  canToggleOutput: boolean;
  canToggleSelectedCells: boolean;
  toggleOutput: () => void;
  toggleSelectedCells: () => void;
  trans: TranslationBundle;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IFilterSelectionState {}

export class FilterSelection extends React.Component<
  IFilterSelectionProps,
  IFilterSelectionState
> {
  render() {
    return (
      <label className={SEARCH_OPTIONS_CLASS}>
        <div>
          <span
            className={
              this.props.canToggleOutput ? '' : SEARCH_OPTIONS_DISABLED_CLASS
            }
          >
            {this.props.trans.__('Search Cell Outputs')}
          </span>
          <input
            type="checkbox"
            disabled={!this.props.canToggleOutput}
            checked={this.props.searchOutput}
            onChange={this.props.toggleOutput}
          />
        </div>
        <div>
          <span
            className={
              this.props.canToggleSelectedCells
                ? ''
                : SEARCH_OPTIONS_DISABLED_CLASS
            }
          >
            {this.props.trans.__('Search Selected Cell(s)')}
          </span>
          <input
            type="checkbox"
            disabled={!this.props.canToggleSelectedCells}
            checked={this.props.searchSelectedCells}
            onChange={this.props.toggleSelectedCells}
          />
        </div>
      </label>
    );
  }
}

export namespace Private {
  export function parseQuery(
    queryString: string,
    caseSensitive: boolean,
    regex: boolean
  ): RegExp | null {
    const flag = caseSensitive ? 'g' : 'gi';
    // escape regex characters in query if its a string search
    const queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    const ret = new RegExp(queryText, flag);

    // If the empty string is hit, the search logic will freeze the browser tab
    //  Trying /^/ or /$/ on the codemirror search demo, does not find anything.
    //  So this is a limitation of the editor.
    if (ret.test('')) {
      return null;
    }

    return ret;
  }

  export function regexEqual(a: RegExp | null, b: RegExp | null): boolean {
    if (!a || !b) {
      return false;
    }
    return (
      a.source === b.source &&
      a.global === b.global &&
      a.ignoreCase === b.ignoreCase &&
      a.multiline === b.multiline
    );
  }
}
