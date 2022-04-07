import { LabIcon } from '@jupyterlab/ui-components';

import wholeWord from '../style/icons/whole-word.svg';
import expandAll from '../style/icons/expand-all.svg';
import collapseAll from '../style/icons/collapse-all.svg';
import replaceAll from '../style/icons/replace-all.svg';
import replace from '../style/icons/replace.svg';

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
