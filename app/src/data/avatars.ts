// Pictures a student can choose for their profile. They are original characters made for this app and bundled
// with it, so no photo is ever taken or uploaded, and the class server only ever stores the id.
// Every character is free to choose from the start. Progress is shown by the ladder (app/ladder.tsx) instead.
// Files have numeric names because Android merges asset names that differ only in punctuation or case.
export interface AvatarDef { id: string; name: string; image: number }

const a = (id: string, name: string, image: number): AvatarDef => ({ id, name, image });

export const AVATARS: AvatarDef[] = [
  a('surfer', 'Surfer', require('../../assets/avatars/a0001.webp')),
  a('snorkeller', 'Snorkeller', require('../../assets/avatars/a0002.webp')),
  a('kite-flyer', 'Kite flyer', require('../../assets/avatars/a0003.webp')),
  a('diver', 'Diver', require('../../assets/avatars/a0004.webp')),
  a('islander', 'Islander', require('../../assets/avatars/a0005.webp')),
  a('explorer', 'Explorer', require('../../assets/avatars/a0006.webp')),
  a('turtle', 'Turtle', require('../../assets/avatars/a0007.webp')),
  a('robot', 'Robot', require('../../assets/avatars/a0008.webp')),

  a('astronaut', 'Astronaut', require('../../assets/avatars/a0009.webp')),
  a('space-pilot', 'Space pilot', require('../../assets/avatars/a0010.webp')),
  a('aviator', 'Aviator', require('../../assets/avatars/a0011.webp')),
  a('pilot', 'Pilot', require('../../assets/avatars/a0012.webp')),

  a('pirate-parrot', 'Pirate parrot', require('../../assets/avatars/a0013.webp')),
  a('kite-surfer', 'Kite surfer', require('../../assets/avatars/a0014.webp')),
  a('cool-turtle', 'Cool turtle', require('../../assets/avatars/a0015.webp')),
  a('treasure-hunter', 'Treasure hunter', require('../../assets/avatars/a0016.webp')),

  a('crab-inventor', 'Crab inventor', require('../../assets/avatars/a0017.webp')),
  a('investor-bot', 'Investor bot', require('../../assets/avatars/a0018.webp')),
  a('captain-parrot', 'Captain parrot', require('../../assets/avatars/a0019.webp')),
  a('longtail', 'Longtail', require('../../assets/avatars/a0020.webp')),
];

const byId = new Map(AVATARS.map((x) => [x.id, x]));
export const avatar = (id: string | undefined): AvatarDef | undefined => (id ? byId.get(id) : undefined);
