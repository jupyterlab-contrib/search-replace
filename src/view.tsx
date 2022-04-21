import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Progress,
  Search,
  Switch,
  TextField,
  Toolbar,
  TreeItem,
  TreeView
} from '@jupyter-notebook/react-components';
import { VDomRenderer } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  caretDownIcon,
  caretRightIcon,
  caseSensitiveIcon,
  ellipsesIcon,
  folderIcon,
  refreshIcon,
  regexIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import React, { useEffect, useState } from 'react';
import {
  collapseAllIcon,
  expandAllIcon,
  replaceAllIcon,
  replaceIcon,
  wholeWordIcon
} from './icon';
import { IResults, SearchReplaceModel } from './model';

function openFile(prefixDir: string, path: string, _commands: CommandRegistry) {
  _commands.execute('docmanager:open', { path: PathExt.join(prefixDir, path) });
}

function createTreeView(
  results: IResults[],
  path: string,
  _commands: CommandRegistry,
  expandStatus: boolean[],
  setExpandStatus: (v: boolean[]) => void,
  onReplace: ((r: IResults[]) => void) | null,
  trans: TranslationBundle
): JSX.Element {
  results.sort((a, b) => (a.path > b.path ? 1 : -1));
  const items = results.map((file, index) => {
    return (
      <TreeItem
        className="search-tree-files"
        expanded={expandStatus[index]}
        onClick={() => {
          const expandStatusNew = [...expandStatus];
          expandStatusNew[index] = !expandStatusNew[index];
          setExpandStatus(expandStatusNew);
        }}
      >
        <span title={file.path}>{file.path}</span>
        {onReplace && (
          <Button
            className="jp-search-replace-item-button jp-mod-icon-only"
            appearance="neutral"
            title={trans.__('Replace All in File')}
            onClick={() => {
              const partialResult: IResults[] = [
                {
                  path: file.path,
                  matches: file.matches
                }
              ];
              onReplace(partialResult);
            }}
          >
            <replaceAllIcon.react></replaceAllIcon.react>
          </Button>
        )}
        <Badge slot="end">{file.matches.length}</Badge>
        {file.matches.map(match => (
          <TreeItem
            className="search-tree-matches"
            onClick={(event: React.MouseEvent) => {
              openFile(path, file.path, _commands);
              event.stopPropagation();
            }}
          >
            <span title={match.line}>
              {match.line.slice(0, match.start_utf8)}
              <mark>{match.match}</mark>
              {match.line.slice(match.end_utf8)}
            </span>
            {onReplace && (
              <Button
                className="jp-search-replace-item-button jp-mod-icon-only"
                appearance="neutral"
                title={trans.__('Replace')}
                onClick={() => {
                  const partialResult: IResults[] = [
                    {
                      path: file.path,
                      matches: [match]
                    }
                  ];
                  onReplace(partialResult);
                }}
              >
                <replaceIcon.react></replaceIcon.react>
              </Button>
            )}
          </TreeItem>
        ))}
      </TreeItem>
    );
  });

  if (items.length === 0) {
    return <p>{trans.__('No Matches Found')}</p>;
  } else {
    return (
      <div className="jp-search-replace-list">
        <TreeView>{items}</TreeView>
      </div>
    );
  }
}

export class SearchReplaceView extends VDomRenderer<SearchReplaceModel> {
  private _commands: CommandRegistry;

  constructor(
    searchModel: SearchReplaceModel,
    commands: CommandRegistry,
    protected trans: TranslationBundle
  ) {
    super(searchModel);
    this._commands = commands;
    this.addClass('jp-search-replace-tab');
  }

  render(): JSX.Element | null {
    return (
      <SearchReplaceElement
        searchString={this.model.searchString}
        onSearchChanged={(s: string) => {
          this.model.searchString = s;
        }}
        replaceString={this.model.replaceString}
        onReplaceString={(s: string) => {
          this.model.replaceString = s;
        }}
        onReplace={(r: IResults[]) => {
          this.model.postReplaceString(r);
        }}
        commands={this._commands}
        isLoading={this.model.isLoading}
        queryResults={this.model.queryResults}
        refreshResults={() => {
          this.model.refreshResults();
        }}
        path={this.model.path}
        onPathChanged={(s: string) => {
          this.model.path = s;
        }}
        options={
          <>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Match Case')}
              appearance={this.model.caseSensitive ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.caseSensitive = !this.model.caseSensitive;
              }}
            >
              <caseSensitiveIcon.react></caseSensitiveIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Match Whole Word')}
              appearance={this.model.wholeWord ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.wholeWord = !this.model.wholeWord;
              }}
            >
              <wholeWordIcon.react></wholeWordIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              title={this.trans.__('Use Regular Expression')}
              appearance={this.model.useRegex ? 'accent' : 'neutral'}
              onClick={() => {
                this.model.useRegex = !this.model.useRegex;
              }}
            >
              <regexIcon.react></regexIcon.react>
            </Button>
          </>
        }
        trans={this.trans}
      >
        <FilterBox
          filters={this.model.filesFilter}
          isExcludeFilter={this.model.excludeToggle}
          onFilterChange={(f: string) => {
            this.model.filesFilter = f;
          }}
          onIsExcludeChange={(b: boolean) => {
            this.model.excludeToggle = b;
          }}
          trans={this.trans}
        ></FilterBox>
      </SearchReplaceElement>
    );
  }
}

interface IBreadcrumbProps {
  path: string;
  onPathChanged: (s: string) => void;
}

const Breadcrumbs = React.memo((props: IBreadcrumbProps) => {
  const pathItems = props.path.split('/');
  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <Button
          className="jp-mod-icon-only"
          appearance="stealth"
          onClick={() => {
            props.onPathChanged('');
          }}
        >
          <folderIcon.react></folderIcon.react>
        </Button>
      </BreadcrumbItem>
      {props.path &&
        pathItems.map((item, index) => {
          return (
            <BreadcrumbItem>
              <Button
                appearance="lightweight"
                onClick={() => {
                  props.onPathChanged(pathItems.slice(0, index + 1).join('/'));
                }}
              >
                {item}
              </Button>
            </BreadcrumbItem>
          );
        })}
    </Breadcrumb>
  );
});

interface ISearchReplaceProps {
  searchString: string;
  queryResults: IResults[];
  commands: CommandRegistry;
  isLoading: boolean;
  onSearchChanged: (s: string) => void;
  replaceString: string;
  onReplaceString: (s: string) => void;
  onReplace: (r: IResults[]) => void;
  children: React.ReactNode;
  refreshResults: () => void;
  path: string;
  onPathChanged: (s: string) => void;
  options: React.ReactNode;
  trans: TranslationBundle;
}

const SearchReplaceElement = (props: ISearchReplaceProps) => {
  const [showReplace, setShowReplace] = useState<boolean>(false);
  const [expandStatus, setExpandStatus] = useState<boolean[]>(
    new Array(props.queryResults.length).fill(true)
  );

  useEffect(() => {
    setExpandStatus(new Array(props.queryResults.length).fill(true));
  }, [props.queryResults]);

  const collapseAll = expandStatus.some(elem => elem);
  const canReplace =
    showReplace && props.replaceString !== '' && props.queryResults.length > 0;

  return (
    <>
      <div className="jp-stack-panel-header">
        <div className="jp-search-replace-header jp-search-replace-row">
          <h2>{props.trans.__('Search')}</h2>
          <div className="jp-Toolbar-spacer"></div>
          <Toolbar>
            <Button
              className="jp-mod-icon-only"
              appearance="stealth"
              title={props.trans.__('Refresh')}
              onClick={() => {
                props.refreshResults();
              }}
            >
              <refreshIcon.react></refreshIcon.react>
            </Button>
            <Button
              className="jp-mod-icon-only"
              appearance="stealth"
              title={
                collapseAll
                  ? props.trans.__('Collapse All')
                  : props.trans.__('Expand All')
              }
              disabled={props.queryResults.length === 0}
              onClick={() => {
                const expandStatusNew = new Array(
                  props.queryResults.length
                ).fill(!collapseAll);
                setExpandStatus(expandStatusNew);
              }}
            >
              {collapseAll ? (
                <collapseAllIcon.react></collapseAllIcon.react>
              ) : (
                <expandAllIcon.react></expandAllIcon.react>
              )}
            </Button>
          </Toolbar>
        </div>
        <Breadcrumbs
          path={props.path}
          onPathChanged={props.onPathChanged}
        ></Breadcrumbs>
      </div>
      <div className="jp-search-replace-row jp-search-replace-collapser">
        <Button
          className="jp-mod-icon-only"
          appearance="stealth"
          title={props.trans.__('Toggle Replace')}
          onClick={() => {
            setShowReplace(!showReplace);
          }}
        >
          {showReplace ? (
            <caretDownIcon.react></caretDownIcon.react>
          ) : (
            <caretRightIcon.react></caretRightIcon.react>
          )}
        </Button>
        <div className="jp-search-replace-column">
          <div className="jp-search-replace-row">
            <Search
              appearance="outline"
              placeholder={props.trans.__('Search')}
              aria-label={props.trans.__('Search Files for Text')}
              onChange={(event: any) => {
                props.onSearchChanged(event.target.value);
              }}
              onInput={(event: any) => {
                props.onSearchChanged(event.target.value);
              }}
              value={props.searchString}
            />
            <Toolbar>{props.options}</Toolbar>
          </div>
          {showReplace && (
            <div className="jp-search-replace-row">
              <TextField
                appearance="outline"
                placeholder={props.trans.__('Replace')}
                onInput={(event: any) => {
                  props.onReplaceString(event.target.value);
                }}
                value={props.replaceString}
              ></TextField>
              <Button
                className="jp-mod-icon-only"
                appearance="stealth"
                title={props.trans.__('Replace All')}
                disabled={!canReplace}
                onClick={() => {
                  props.onReplace(props.queryResults);
                }}
              >
                <replaceAllIcon.react></replaceAllIcon.react>
              </Button>
            </div>
          )}
        </div>
      </div>
      {props.children}
      {props.searchString && (
        <p className="jp-search-replace-statistics">
          {props.trans._n(
            '%2 result(s) in %1 file',
            '%2 results in %1 files',
            props.queryResults.map(r => r.path).length,
            props.queryResults.reduce(
              (agg, current) => agg + current.matches.length,
              0
            )
          )}
        </p>
      )}
      {props.isLoading ? (
        <Progress />
      ) : (
        props.searchString &&
        createTreeView(
          props.queryResults,
          props.path,
          props.commands,
          expandStatus,
          setExpandStatus,
          canReplace ? props.onReplace : null,
          props.trans
        )
      )}
    </>
  );
};

interface IFilterBoxProps {
  filters: string;
  onFilterChange: (f: string) => void;
  isExcludeFilter: boolean;
  onIsExcludeChange: (b: boolean) => void;
  trans: TranslationBundle;
}

const FilterBox = React.memo((props: IFilterBoxProps) => {
  const [show, setShow] = useState<boolean>(false);
  const { filters, onFilterChange, isExcludeFilter, onIsExcludeChange, trans } =
    props;
  return (
    <div className="jp-search-replace-filtersBox">
      <Button
        className="jp-search-replace-filters-collapser jp-mod-icon-only"
        appearance="stealth"
        title={props.trans.__('Toggle Search Filters')}
        onClick={() => {
          setShow(!show);
        }}
      >
        <ellipsesIcon.react></ellipsesIcon.react>
      </Button>
      {show && (
        <>
          <TextField
            appearance="outline"
            placeholder={trans.__('e.g. *.py, src/**/include')}
            onChange={(event: any) => {
              onFilterChange(event.target.value);
            }}
            onInput={(event: any) => {
              onFilterChange(event.target.value);
            }}
            value={filters}
          >
            {trans.__('File filters')}
          </TextField>
          <Switch
            title={trans.__('Toggle File Filter Mode')}
            onChange={(event: any) => {
              onIsExcludeChange(event.target.checked);
            }}
            checked={isExcludeFilter}
          >
            <span slot="checked-message">{trans.__('Files to Exclude')}</span>
            <span slot="unchecked-message">{trans.__('Files to Include')}</span>
          </Switch>
        </>
      )}
    </div>
  );
});
