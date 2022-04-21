import { LabIcon } from '@jupyterlab/ui-components';

import wholeWord from '@vscode/codicons/src/icons/whole-word.svg';
import expandAll from '@vscode/codicons/src/icons/expand-all.svg';
import collapseAll from '@vscode/codicons/src/icons/collapse-all.svg';
import replaceAll from '@vscode/codicons/src/icons/replace-all.svg';
import replace from '@vscode/codicons/src/icons/replace.svg';

export const wholeWordIcon = new LabIcon({
  name: 'search-replace:wholeWord',
  svgstr: wholeWord
});

export const expandAllIcon = new LabIcon({
  name: 'search-replace:expandAll',
  svgstr: expandAll
});

export const collapseAllIcon = new LabIcon({
  name: 'search-replace:collapseAll',
  svgstr: collapseAll
});

export const replaceAllIcon = new LabIcon({
  name: 'search-replace:replaceAll',
  svgstr: replaceAll
});

export const replaceIcon = new LabIcon({
  name: 'search-replace:replace',
  svgstr: replace
});
