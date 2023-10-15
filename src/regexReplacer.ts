/**
 * Replace worker code
 */
import type { SearchReplace } from './tokens';

onmessage = function (e) {
  const [regexp, flags, replace, matches] = e.data as [
    string,
    string,
    string,
    SearchReplace.IFileMatch[]
  ];

  const searchRegexp = new RegExp(regexp, flags);

  matches.forEach(f => {
    f.matches.forEach(m => {
      m.replace = m.match.replace(searchRegexp, replace);
    });
  });

  postMessage(matches);
};
