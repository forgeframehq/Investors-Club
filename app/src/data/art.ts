// Pictures for the six rungs of the progress ladder and the sixteen badges. Original art made for this app.
// Files have numeric names because Android merges asset names that differ only in punctuation or case.

/** Rank emblems, one per rung of the ladder, bottom rung first (Rookie ... Tycoon). */
export const RANK_ART: number[] = [
  require('../../assets/art/r0001.webp'),
  require('../../assets/art/r0002.webp'),
  require('../../assets/art/r0003.webp'),
  require('../../assets/art/r0004.webp'),
  require('../../assets/art/r0005.webp'),
  require('../../assets/art/r0006.webp'),
];

/** Medal pictures, by badge id (see `badges()` in lib/store.ts). */
export const BADGE_ART: Record<string, number> = {
  'first-trade': require('../../assets/art/b0001.webp'),
  'first-lesson': require('../../assets/art/b0002.webp'),
  'word-10': require('../../assets/art/b0003.webp'),
  'cards-round': require('../../assets/art/b0004.webp'),
  'cards-20': require('../../assets/art/b0005.webp'),
  'streak-3': require('../../assets/art/b0006.webp'),
  'streak-5': require('../../assets/art/b0007.webp'),
  'guess-5': require('../../assets/art/b0008.webp'),
  'three-baskets': require('../../assets/art/b0009.webp'),
  'five-companies': require('../../assets/art/b0010.webp'),
  fund: require('../../assets/art/b0011.webp'),
  local: require('../../assets/art/b0012.webp'),
  green: require('../../assets/art/b0013.webp'),
  patient: require('../../assets/art/b0014.webp'),
  'word-all': require('../../assets/art/b0015.webp'),
  graduate: require('../../assets/art/b0016.webp'),
};
