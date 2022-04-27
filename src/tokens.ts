export namespace SearchReplace {
  /**
   * Search query results
   */
  export interface ISearchQuery {
    /**
     * Matches per file
     */
    matches: IFileMatch[];
  }

  /**
   * Interface to represent matches in a file
   */
  export interface IFileMatch {
    /**
     * path of file
     */
    path: string;
    /**
     * all matches within that file
     */
    matches: IMatch[];
  }

  export interface IMatch extends IReplacement {
    /**
     * line containing the match
     */
    line: string;
    /**
     * the actual match itself
     */
    match: string;
    /**
     * the offset from the beginning of file
     */
    absolute_offset: number;
  }

  /**
   * Replace query body
   */
  export interface IReplaceQuery {
    /**
     * Replacements per file
     */
    matches: IFileReplacement[];
  }

  /**
   * Interface to represent replacements in a file
   */
  export interface IFileReplacement {
    /**
     * path of file
     */
    path: string;
    /**
     * all replacements within that file
     */
    matches: IReplacement[];
  }

  export interface IReplacement {
    /**
     * starting offset of the match in binary format
     */
    start: number;
    /**
     * ending offset of the match in binary format
     */
    end: number;
    /**
     * starting offset of the match in utf-8 format
     */
    start_utf8: number;
    /**
     * ending offset of the match in utf-8 format
     */
    end_utf8: number;
    /**
     * the base-1 line number where the match occurs
     */
    line_number: number;
    /**
     * Replacement string
     */
    replace: string | null;
  }
}
