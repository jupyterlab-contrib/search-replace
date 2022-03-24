import { LabIcon } from '@jupyterlab/ui-components';

import wholeWord from '../style/icons/whole-word.svg';
import expandAll from '../style/icons/expand-all.svg';

export const wholeWordIcon = new LabIcon({
  name: 'search-replace:wholeWord',
  svgstr: wholeWord
});

export const expandAllIcon = new LabIcon({
  name: 'search-replace:expandAll',
  svgstr: expandAll
});
