// Pictures a student can choose for their profile. They are original characters made for this app and bundled
// with it, so no photo is ever taken or uploaded, and the class server only ever stores the id.
// The first eight are there from the start; the rest unlock as the student's investor level goes up.
// Files have numeric names because Android merges asset names that differ only in punctuation or case.
export interface AvatarDef { id: string; name: string; image: number; tier: number }

/** Tier 0 is open to everyone. Tier n unlocks at investor level n + 1. */
export const TIERS = [
  { name: 'Starter', level: 1, colour: '#9FB3C8' },
  { name: 'Rare', level: 2, colour: '#3D8FE0' },
  { name: 'Epic', level: 3, colour: '#8E7BE0' },
  { name: 'Legendary', level: 4, colour: '#F2B63C' },
];

const a = (id: string, name: string, image: number, tier: number): AvatarDef => ({ id, name, image, tier });

export const AVATARS: AvatarDef[] = [
  a('surfer', 'Surfer', require('../../assets/avatars/a0001.webp'), 0),
  a('snorkeller', 'Snorkeller', require('../../assets/avatars/a0002.webp'), 0),
  a('kite-flyer', 'Kite flyer', require('../../assets/avatars/a0003.webp'), 0),
  a('diver', 'Diver', require('../../assets/avatars/a0004.webp'), 0),
  a('islander', 'Islander', require('../../assets/avatars/a0005.webp'), 0),
  a('explorer', 'Explorer', require('../../assets/avatars/a0006.webp'), 0),
  a('turtle', 'Turtle', require('../../assets/avatars/a0007.webp'), 0),
  a('robot', 'Robot', require('../../assets/avatars/a0008.webp'), 0),

  a('astronaut', 'Astronaut', require('../../assets/avatars/a0009.webp'), 1),
  a('space-pilot', 'Space pilot', require('../../assets/avatars/a0010.webp'), 1),
  a('aviator', 'Aviator', require('../../assets/avatars/a0011.webp'), 1),
  a('pilot', 'Pilot', require('../../assets/avatars/a0012.webp'), 1),

  a('pirate-parrot', 'Pirate parrot', require('../../assets/avatars/a0013.webp'), 2),
  a('kite-surfer', 'Kite surfer', require('../../assets/avatars/a0014.webp'), 2),
  a('cool-turtle', 'Cool turtle', require('../../assets/avatars/a0015.webp'), 2),
  a('treasure-hunter', 'Treasure hunter', require('../../assets/avatars/a0016.webp'), 2),

  a('crab-inventor', 'Crab inventor', require('../../assets/avatars/a0017.webp'), 3),
  a('investor-bot', 'Investor bot', require('../../assets/avatars/a0018.webp'), 3),
  a('captain-parrot', 'Captain parrot', require('../../assets/avatars/a0019.webp'), 3),
  a('longtail', 'Longtail', require('../../assets/avatars/a0020.webp'), 3),
];

const byId = new Map(AVATARS.map((x) => [x.id, x]));
export const avatar = (id: string | undefined): AvatarDef | undefined => (id ? byId.get(id) : undefined);
