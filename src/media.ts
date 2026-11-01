// A day is a local date in the form 'YYYY-MM-DD'. The keys sort in date order.
export type Day = string;

// A kind of media that the user defines, for example "Books".
export interface Category {
  id: string;
  name: string;
  color: string;
}

// One movie, book, game or other media item.
export interface Item {
  id: string;
  categoryId: string;
  title: string;
  start: Day;
  // The day on which the user finished the item. Missing while in progress.
  end?: Day;
  // From 1 to 5 stars. Missing when not rated.
  rating?: number;
  note?: string;
}

export interface Data {
  categories: Category[];
  items: Item[];
}

const STORAGE_KEY = 'media-tracker.v1';

// The app id and the storage keys of a backup file.
export const BACKUP_APP = 'media-tracker';
export const isDataKey = (key: string) => key === STORAGE_KEY;

// Colors that the user can select for a category.
export const COLORS = [
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#f4511e',
  '#fb8c00',
  '#00897b',
  '#6d4c41',
];

export const MAX_RATING = 5;

const DEFAULT_CATEGORIES = ['Movies', 'Series', 'Books', 'Games'];

// The data on the first start: a set of default categories and no items.
function initialData(): Data {
  const categories = DEFAULT_CATEGORIES.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    color: COLORS[i],
  }));
  return { categories, items: [] };
}

export function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData();
    const data = JSON.parse(raw) as Partial<Data>;
    return { categories: data.categories ?? [], items: data.items ?? [] };
  } catch {
    return initialData();
  }
}

export function saveData(data: Data): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage is full or blocked; the data stays in memory only.
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toDay(date: Date): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDay(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): Day {
  return toDay(new Date());
}

// Return the first color that no category uses, or cycle through COLORS when
// all colors are in use.
export function nextColor(categories: Category[]): string {
  const used = new Set(categories.map((c) => c.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[categories.length % COLORS.length];
}

// The fields of an item that the user edits.
export type ItemFields = Omit<Item, 'id'>;

export function saveItem(data: Data, id: string | null, fields: ItemFields): Data {
  const item: Item = { ...fields, id: id ?? crypto.randomUUID() };
  // Leave out empty optional fields, so that the stored data stays small.
  if (!item.end) delete item.end;
  if (!item.rating) delete item.rating;
  if (!item.note) delete item.note;
  const items = id ? data.items.map((i) => (i.id === id ? item : i)) : [...data.items, item];
  return { ...data, items };
}

export function removeItem(data: Data, id: string): Data {
  return { ...data, items: data.items.filter((i) => i.id !== id) };
}

// Mark an item as finished on the given day.
export function finishItem(data: Data, id: string, day: Day): Data {
  return {
    ...data,
    items: data.items.map((i) => (i.id === id ? { ...i, end: day < i.start ? i.start : day } : i)),
  };
}

export function saveCategory(data: Data, id: string | null, name: string, color: string): Data {
  const categories = id
    ? data.categories.map((c) => (c.id === id ? { ...c, name, color } : c))
    : [...data.categories, { id: crypto.randomUUID(), name, color }];
  return { ...data, categories };
}

// Remove a category and all its items.
export function removeCategory(data: Data, id: string): Data {
  return {
    categories: data.categories.filter((c) => c.id !== id),
    items: data.items.filter((i) => i.categoryId !== id),
  };
}

// The items in progress, newest start first.
export function inProgress(items: Item[]): Item[] {
  return items
    .filter((i) => !i.end)
    .sort((a, b) => b.start.localeCompare(a.start) || a.title.localeCompare(b.title));
}

// The finished items by the year of the end day, newest year and newest end
// day first.
export function finishedByYear(items: Item[]): [string, Item[]][] {
  const done = items
    .filter((i) => i.end)
    .sort((a, b) => b.end!.localeCompare(a.end!) || a.title.localeCompare(b.title));
  const years = new Map<string, Item[]>();
  for (const item of done) {
    const year = item.end!.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), item]);
  }
  return [...years];
}

// A short date: day and month, with the year only when it is not the current
// year.
export function shortDate(day: Day): string {
  const date = fromDay(day);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// The number of days from start to end, both included.
export function duration(start: Day, end: Day): number {
  return Math.round((fromDay(end).getTime() - fromDay(start).getTime()) / 86_400_000) + 1;
}
