import { LabIcon } from '@jupyterlab/ui-components';

import wholeWord from '../style/icons/whole-word.svg';
import expandAll from '../style/icons/expand-all.svg';
import collapseAll from '../style/icons/collapse-all.svg';

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
