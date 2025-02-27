export const APP_PATHS = {
  root: 'app',
  login: 'login',
  calendar: 'calendar',
  chatRooms: {
    root: 'chats',
  },
  holidays: 'holidays',
  publications: 'publications',
  users: {
    root: 'users',
  },
  notifications: {
    root: 'notifications',
  },
  profileDetails: 'profile',
};

// Rekurzív típus, mely arra szolgál, hogy egy sztringhez pontot adjon hozzá.
// Ha az T egy üres string, akkor visszaad egy üres stringet,
// ha nem, akkor a string elé egy pontot rak (pl. 'f' -> '.f').
type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

type DotNestedKeys<T> = (
  T extends object
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ''
) extends infer D
  ? Extract<D, string>
  : never;

export type NestedPaths = DotNestedKeys<typeof APP_PATHS>;

export const absolutePath = (path: NestedPaths) => {
  const pathSegments = path.split('.');
  let absPath = '';
  let currentPath: any = APP_PATHS;
  for (const p of pathSegments) {
    // ha üres path, akkor ne legyen extra perjel
    if (p) {
      absPath += currentPath.root;
      absPath += '/';
      currentPath = currentPath[p];
    }
  }

  // ha üres path, akkor ne legyen extra perjel
  // ha root, akkor már nem kell tovább hozzáfűzni
  if (!path.endsWith('.root') && currentPath) {
    absPath += currentPath;
  } else {
    // trim trailing slash
    absPath = absPath.slice(0, -1);
  }

  return absPath;
};
