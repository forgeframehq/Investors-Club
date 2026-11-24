// Pictures a student can choose for their profile. They are drawn from the app's own icon set, so no photo is
// ever taken or uploaded, and the class server only ever stores the id.
import type { IconName } from '@/ui/kit';

export interface AvatarDef { id: string; name: string; icon: IconName; colour: string }

const a = (id: string, name: string, icon: IconName, colour: string): AvatarDef => ({ id, name, icon, colour });

export const AVATARS: AvatarDef[] = [
  a('rocket', 'Rocket', 'rocket', '#E0527A'),
  a('planet', 'Planet', 'planet', '#7C5CD6'),
  a('paw', 'Paw', 'paw', '#D98A12'),
  a('football', 'Football', 'football', '#12A38B'),
  a('basketball', 'Basketball', 'basketball', '#E36F2C'),
  a('music', 'Music', 'musical-notes', '#1E88C8'),
  a('gamer', 'Gamer', 'game-controller', '#6E9E12'),
  a('bike', 'Bike', 'bicycle', '#1C9AA8'),
  a('boat', 'Boat', 'boat', '#1E88C8'),
  a('fish', 'Fish', 'fish', '#12A38B'),
  a('flash', 'Lightning', 'flash', '#D9A300'),
  a('leaf', 'Leaf', 'leaf', '#3E9E5A'),
  a('star', 'Star', 'star', '#D98A12'),
  a('pizza', 'Pizza', 'pizza', '#E36F2C'),
  a('icecream', 'Ice cream', 'ice-cream', '#E0527A'),
  a('diamond', 'Diamond', 'diamond', '#7C5CD6'),
];

const byId = new Map(AVATARS.map((x) => [x.id, x]));
export const avatar = (id: string | undefined): AvatarDef | undefined => (id ? byId.get(id) : undefined);
