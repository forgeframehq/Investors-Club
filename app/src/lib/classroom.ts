// Classes. A teacher signs in, creates classes and gets a join code for each; students join with the code, a name
// and a PIN.
// No email addresses or real accounts. In a class, the server keeps each portfolio and fills every trade at its
// own price, so the leaderboard is fair. All of this is optional: the app works alone as a practice portfolio.
import { getJson, refreshQuotes, serverUrl } from './market';
import { db, progress, setClass, setClassPortfolio, setTeacher } from './store';
import type { ClassLink, ClassSummary, Portfolio, SchoolStanding, Standing, StudentDetail } from './types';

type ServerPortfolio = Omit<Portfolio, 'snapshots'>;

function call(server: string, path: string, body?: unknown, token?: string) {
  return getJson(`${server}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const mine = (path: string, body?: unknown) => {
  if (!db.cls) throw new Error('You are not in a class.');
  return call(db.cls.server, path, body, db.cls.token);
};
const asTeacher = (path: string, body?: unknown) => {
  if (!db.teacher) throw new Error('Sign in as a teacher first.');
  return call(db.teacher.server, path, body, db.teacher.token);
};
function needServer(): string {
  const server = serverUrl();
  if (!server) throw new Error('This app is not connected to a class server yet. Ask your teacher, or open Settings, then Market data.');
  return server;
}

// ---------- students ----------

/** Schools with classes on this server, best average first. Also used for the schools table. */
export async function schools(): Promise<SchoolStanding[]> {
  return (await call(needServer(), '/schools')).schools;
}
/** The classes at one school, for choosing yours. */
export async function schoolClasses(school: string): Promise<{ id: string; name: string; teacher: string }[]> {
  return (await call(needServer(), `/school-classes?school=${encodeURIComponent(school)}`)).classes;
}

/** Joins a class, or signs back in on a new device if the name and PIN match. `classId` is the class picked from the list. */
export async function joinClass(classId: string, code: string, name: string, pin: string) {
  const server = needServer();
  const j = await call(server, '/join', { class: classId || undefined, code: code.trim().toUpperCase(), name: name.trim(), pin: pin.trim(), avatar: db.settings.avatar });
  const link: ClassLink = { server, code: j.class.code, className: j.class.name, school: j.class.school, token: j.token, name: j.name };
  db.cls = link;
  setClassPortfolio(j.portfolio as ServerPortfolio);
  refreshQuotes(true);
  syncPortfolio().catch(() => {});
}

export function leaveClass() {
  setClass(null);
}

/** Pulls the latest copy of your class portfolio, and tells the class server your picture and what you have learned. */
export async function syncPortfolio() {
  if (!db.cls) return;
  const j = await mine('/me', { avatar: db.settings.avatar, progress: progress() });
  setClassPortfolio(j.portfolio as ServerPortfolio);
}

/** Places a class trade. The server decides the price. */
export async function tradeInClass(symbol: string, side: 'buy' | 'sell', shares: number) {
  const j = await mine('/trade', { symbol, side, shares });
  if (j.quote) db.quotes[symbol] = j.quote;
  setClassPortfolio(j.portfolio as ServerPortfolio);
  return j.trade as { price: number; shares: number };
}

export async function leaderboard(): Promise<{ className: string; paused: boolean; hoursOnly: boolean; standings: Standing[] }> {
  const j = await mine('/leaderboard');
  return { className: j.class.name, paused: !!j.class.paused, hoursOnly: !!j.class.hours_only, standings: j.standings };
}

// ---------- teachers ----------

/** Makes a teacher account. `schoolKey` is only needed if the server was set up to require one. */
export async function teacherSignUp(name: string, school: string, login: string, password: string, schoolKey: string) {
  const server = needServer();
  const j = await call(server, '/teacher/signup', { name: name.trim(), school: school.trim(), login: login.trim(), password, school_key: schoolKey.trim() });
  setTeacher({ server, token: j.token, name: j.name, login: j.login, school: j.school });
}
export async function teacherSignIn(login: string, password: string) {
  const server = needServer();
  const j = await call(server, '/teacher/login', { login: login.trim(), password });
  setTeacher({ server, token: j.token, name: j.name, login: j.login, school: j.school });
}
export async function teacherSignOut() {
  await asTeacher('/teacher/logout', {}).catch(() => {}); // sign out on this device even with no connection
  setTeacher(null);
}

export async function teacherClasses(): Promise<ClassSummary[]> {
  return (await asTeacher('/teacher/classes')).classes;
}
export const createClass = (name: string, startCash: number): Promise<{ code: string; name: string }> => asTeacher('/teacher/classes', { name: name.trim(), start_cash: startCash });
export interface TeacherClassView { code: string; name: string; startCash: number; paused: boolean; hoursOnly: boolean; students: StudentDetail[] }
export async function teacherClass(code: string): Promise<TeacherClassView> {
  const j = await asTeacher(`/teacher/class?code=${encodeURIComponent(code)}`);
  return { code: j.class.code, name: j.class.name, startCash: j.class.start_cash, paused: !!j.class.paused, hoursOnly: !!j.class.hours_only, students: j.standings };
}
export const removeStudent = (code: string, id: string) => asTeacher('/teacher/remove', { code, student_id: id });
export const resetPin = (code: string, id: string) => asTeacher('/teacher/reset-pin', { code, student_id: id });
/** Changes a class's name or its trading rules. Leave out what should stay as it is. */
export const updateClass = (code: string, change: { name?: string; paused?: boolean; hoursOnly?: boolean }) => asTeacher('/teacher/update-class', { code, name: change.name, paused: change.paused, hours_only: change.hoursOnly });
export const restartClass = (code: string) => asTeacher('/teacher/restart', { code });
export const deleteClass = (code: string) => asTeacher('/teacher/delete-class', { code });
