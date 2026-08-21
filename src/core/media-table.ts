export interface MediaTableLayout {
  creatorWidth: number;
  slugWidth: number;
}

export function mediaTableLayout(narrow: boolean): MediaTableLayout {
  return {
    creatorWidth: narrow ? 0 : 14,
    slugWidth: narrow ? 16 : 22,
  };
}
