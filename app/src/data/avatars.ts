// Pictures a student can choose for their profile. They are drawn from the app's own icon set, so no photo is
// ever taken or uploaded, and the class server only ever stores the id.
import type { IconName } from '@/ui/kit';

export interface AvatarDef { id: string; name: string; icon: IconName; colour: string }

const a = (id: string, name: string, icon: IconName, colour: string): AvatarDef => ({ id, name, icon, colour });

export const AVATARS: AvatarDef[] = [
  a('rocket', 'Rocket', 'rocket', '#FF7A90'),
  a('planet', 'Planet', 'planet', '#B79CFF'),
  a('paw', 'Paw', 'paw', '#FFB454'),
  a('football', 'Football', 'football', '#2EE6A6'),
  a('basketball', 'Basketball', 'basketball', '#FF9D5C'),
  a('music', 'Music', 'musical-notes', '#4CC2FF'),
  a('gamer', 'Gamer', 'game-controller', '#C8F031'),
  a('bike', 'Bike', 'bicycle', '#7CE0E6'),
  a('boat', 'Boat', 'boat', '#4CC2FF'),
  a('fish', 'Fish', 'fish', '#2EE6A6'),
  a('flash', 'Lightning', 'flash', '#FFD23F'),
  a('leaf', 'Leaf', 'leaf', '#7BD88F'),
  a('star', 'Star', 'star', '#FFB454'),
  a('pizza', 'Pizza', 'pizza', '#FF9D5C'),
  a('icecream', 'Ice cream', 'ice-cream', '#FF7A90'),
  a('diamond', 'Diamond', 'diamond', '#B79CFF'),
];

const byId = new Map(AVATARS.map((x) => [x.id, x]));
export const avatar = (id: string | undefined): AvatarDef | undefined => (id ? byId.get(id) : undefined);
