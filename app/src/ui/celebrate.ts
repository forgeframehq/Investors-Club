import { badges, did, level, streak } from '@/lib/store';

import { alertBox, toast } from './overlay';

/**
 * Call before something that might earn a badge, then call the returned function afterwards.
 * It congratulates the student on anything new.
 */
export function watchBadges() {
  const had = new Set(badges().filter((b) => b.earned).map((b) => b.id));
  const was = level().number;
  return async () => {
    const fresh = badges().filter((b) => b.earned && !had.has(b.id));
    for (const b of fresh) await alertBox(`Badge earned: ${b.title}`, `${b.how}. Nice work!`);
    const now = level();
    if (now.number > was) await alertBox(`Level ${now.number}: ${now.name}`, now.number <= 4 ? 'You moved up a level, and new profile pictures are unlocked. Find them in your profile.' : 'You moved up a level. Keep learning to reach the next one.');
  };
}

/** Call when the student does something a daily mission might ask for. Says so if it finished one. */
export async function mission(id: string) {
  const had = new Set(badges().filter((b) => b.earned).map((b) => b.id));
  const result = did(id);
  if (result === 'one') toast('Mission done');
  if (result !== 'all') return;
  const days = streak();
  toast(days > 1 ? `All three missions done. ${days} days in a row!` : 'All three missions done today!');
  for (const b of badges().filter((x) => x.earned && !had.has(x.id))) await alertBox(`Badge earned: ${b.title}`, `${b.how}. Nice work!`);
}
