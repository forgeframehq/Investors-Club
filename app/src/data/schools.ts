// Schools in Bermuda, for teachers to choose from when they make an account. A teacher whose school is missing
// can type its name instead. Shared with the class server: keep this file free of React Native imports.
// The public system is being reorganised (middle schools are being phased out and some primaries have closed),
// so check this list each school year.
export type SchoolKind = 'Primary' | 'Middle' | 'Senior' | 'Private' | 'Special';
export interface School { name: string; kind: SchoolKind }

const list = (kind: SchoolKind, names: string[]): School[] => names.map((name) => ({ name, kind }));

export const SCHOOLS: School[] = [
  ...list('Primary', [
    'Dalton E. Tucker Primary', 'East End Primary', 'Elliot Primary', 'Francis Patton Primary', 'Harrington Sound Primary',
    'Heron Bay Primary', 'Northlands Primary', 'Paget Primary', 'Port Royal Primary', 'Purvis Primary', 'Somerset Primary',
    "St David's Primary", "St George's Preparatory", 'Victor Scott Primary', 'West End Primary', 'West Pembroke Primary',
  ]),
  ...list('Middle', ['Clearwater Middle School', 'Dellwood Middle School', 'Sandys Secondary Middle School', 'Whitney Institute Middle School']),
  ...list('Senior', ['The Berkeley Institute', 'CedarBridge Academy']),
  ...list('Private', [
    'Bermuda Centre for Creative Learning', 'Bermuda High School', 'Bermuda Institute', 'Chatmore British International School',
    'Mount Saint Agnes Academy', 'Saltus Grammar School', 'Somersfield Academy', 'Warwick Academy',
  ]),
  ...list('Special', ['Dame Marjorie Bean Hope Academy']),
];
