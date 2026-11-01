import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { type Backup, exportBackup, readBackup, restoreBackup } from './backup';
import { Icon, type IconName } from './icons';
import {
  BACKUP_APP,
  COLORS,
  type Category,
  type Data,
  type Day,
  type Item,
  type ItemFields,
  type Status,
  MAX_RATING,
  duration,
  finishItem,
  endedByYear,
  inProgress,
  isDataKey,
  loadData,
  moveCategory,
  nextColor,
  ranking,
  removeCategory,
  removeItem,
  saveCategory,
  saveData,
  saveItem,
  shortDate,
  today,
} from './media';
import { SwipeRow } from './SwipeRow';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The open sheet: an item form (id null for a new item), the category list, a
// category form (id null for a new category) or the backup.
type Sheet =
  | { kind: 'item'; id: string | null }
  | { kind: 'categories' }
  | { kind: 'category'; id: string | null }
  | { kind: 'backup' }
  | null;

const STATUSES: (Status | null)[] = [null, 'completed', 'aborted'];
const STATUS_LABELS: Record<Status, string> = { completed: 'Completed', aborted: 'Aborted' };

// The list shows the items by state and year; the ranking shows the items by
// rating.
type View = 'list' | 'ranking';

export default function App() {
  const [data, setData] = useState<Data>(loadData);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the shown category, or null for all categories.
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  // The id of the item whose row shows the swipe actions.
  const [swiped, setSwiped] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveData(data), [data]);

  const close = () => setSheet(null);
  const category = (id: string) => data.categories.find((c) => c.id === id);
  const text = search.trim().toLowerCase();
  const shown = data.items.filter(
    (i) =>
      (filter === null || i.categoryId === filter) &&
      category(i.categoryId) &&
      (!text ||
        i.title.toLowerCase().includes(text) ||
        String(i.year ?? '').includes(text) ||
        i.note?.toLowerCase().includes(text)),
  );
  const current = inProgress(shown);
  const years = endedByYear(shown);
  const ranked = ranking(shown);
  const unrated = shown.filter((i) => !i.rating).sort((a, b) => a.title.localeCompare(b.title));
  const sheetItem = sheet?.kind === 'item' ? data.items.find((i) => i.id === sheet.id) : undefined;
  const sheetCategory = sheet?.kind === 'category' ? category(sheet.id ?? '') : undefined;

  const row = (item: Item, rank?: number) => (
    <ItemRow
      key={item.id}
      item={item}
      rank={rank}
      category={category(item.categoryId)!}
      open={swiped === item.id}
      onOpen={() => setSwiped(item.id)}
      onClose={() => setSwiped(null)}
      onEdit={() => {
        setSwiped(null);
        setSheet({ kind: 'item', id: item.id });
      }}
      onDelete={() => {
        setSwiped(null);
        setData((d) => removeItem(d, item.id));
      }}
      onFinish={() => setData((d) => finishItem(d, item.id, today()))}
    />
  );

  return (
    <main>
      <header>
        <h1>Media</h1>
        <div className="header-buttons">
          <button
            className="icon"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            <Icon name={THEME_ICONS[theme]} />
          </button>
          <button
            className="icon"
            onClick={() => setSheet({ kind: 'categories' })}
            aria-label="Categories"
            title="Categories"
          >
            <Icon name="tag" />
          </button>
          <button
            className="icon"
            onClick={() => setSheet({ kind: 'backup' })}
            aria-label="Backup"
            title="Backup"
          >
            <Icon name="backup" />
          </button>
          <button
            className="add"
            onClick={() =>
              setSheet(data.categories.length ? { kind: 'item', id: null } : { kind: 'category', id: null })
            }
            aria-label="Add item"
            title="Add item"
          >
            <Icon name="plus" size={24} />
          </button>
        </div>
      </header>

      <div className="filters" role="radiogroup" aria-label="Category">
        {[null, ...data.categories].map((c) => (
          <button
            key={c?.id ?? 'all'}
            role="radio"
            aria-checked={filter === (c?.id ?? null)}
            style={c ? ({ '--color': c.color } as CSSProperties) : undefined}
            onClick={() => setFilter(c?.id ?? null)}
          >
            {c?.name ?? 'All'}
          </button>
        ))}
      </div>

      {data.items.length > 0 && (
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Search"
            aria-label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="views" role="radiogroup" aria-label="View">
            {(
              [
                ['list', 'list', 'List'],
                ['ranking', 'rank', 'Ranking'],
              ] as const
            ).map(([v, icon, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={view === v}
                aria-label={label}
                title={label}
                onClick={() => setView(v)}
              >
                <Icon name={icon} />
              </button>
            ))}
          </div>
        </div>
      )}

      {data.items.length === 0 && <p className="empty">No items. Tap + to add a movie, a book or a game.</p>}
      {data.items.length > 0 && shown.length === 0 && <p className="empty">No items match.</p>}

      {view === 'ranking' && ranked.length > 0 && (
        <section>
          <h2 className="group">
            Ranking {filter === null ? '' : category(filter)?.name} <span>{ranked.length}</span>
          </h2>
          <ul>{ranked.map(([rank, item]) => row(item, rank))}</ul>
        </section>
      )}

      {view === 'ranking' && unrated.length > 0 && (
        <section>
          <h2 className="group">
            Not rated <span>{unrated.length}</span>
          </h2>
          <ul>{unrated.map((item) => row(item))}</ul>
        </section>
      )}

      {view === 'list' && current.length > 0 && (
        <section>
          <h2 className="group">
            Ongoing <span>{current.length}</span>
          </h2>
          <ul>{current.map((item) => row(item))}</ul>
        </section>
      )}

      {view === 'list' &&
        years.map(([year, items]) => (
          <section key={year}>
            <h2 className="group">
              {year || 'No end day'} <span>{items.length}</span>
            </h2>
            <ul>{items.map((item) => row(item))}</ul>
          </section>
        ))}

      {sheet?.kind === 'item' && (
        <ItemForm
          key={sheet.id ?? 'new'}
          item={sheetItem}
          categories={data.categories}
          defaultCategory={filter ?? data.categories[0]?.id ?? ''}
          onCancel={close}
          onSave={(fields) => {
            setData((d) => saveItem(d, sheetItem?.id ?? null, fields));
            close();
          }}
          onDelete={
            sheetItem
              ? () => {
                  setData((d) => removeItem(d, sheetItem.id));
                  close();
                }
              : undefined
          }
        />
      )}

      {sheet?.kind === 'categories' && (
        <CategoryList
          data={data}
          onSelect={(id) => setSheet({ kind: 'category', id })}
          onMove={(from, to) => setData((d) => moveCategory(d, from, to))}
          onClose={close}
        />
      )}

      {sheet?.kind === 'category' && (
        <CategoryForm
          key={sheet.id ?? 'new'}
          category={sheetCategory}
          color={sheetCategory?.color ?? nextColor(data.categories)}
          count={data.items.filter((i) => i.categoryId === sheetCategory?.id).length}
          onCancel={() => setSheet({ kind: 'categories' })}
          onSave={(name, color) => {
            setData((d) => saveCategory(d, sheetCategory?.id ?? null, name, color));
            setSheet({ kind: 'categories' });
          }}
          onDelete={
            sheetCategory
              ? () => {
                  setData((d) => removeCategory(d, sheetCategory.id));
                  if (filter === sheetCategory.id) setFilter(null);
                  setSheet({ kind: 'categories' });
                }
              : undefined
          }
        />
      )}

      {sheet?.kind === 'backup' && <BackupSheet onClose={close} />}
    </main>
  );
}

// The dates of an item: the start and the end, with the number of days. An
// ongoing item shows the start only. Empty for a
// completed or aborted item without dates.
function dates({ start, end, status }: Item): string {
  if (!status) return start ? `Since ${shortDate(start)}` : 'Ongoing';
  if (!start) return end ? shortDate(end) : '';
  if (!end) return `From ${shortDate(start)}`;
  if (start === end) return shortDate(end);
  const days = duration(start, end);
  if (days === 1) return shortDate(end);
  return `${shortDate(start)} – ${shortDate(end)} · ${days} days`;
}

interface ItemRowProps {
  item: Item;
  // The place of the item in the ranking.
  rank?: number;
  category: Category;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFinish: () => void;
}

// One item in the list. A tap opens the item form. The row shows the title
// with the year of the work, the rating, and the state: a completed item has
// a filled check mark, an aborted item has a filled cross, and an ongoing item
// has a button that completes it today.
// In the ranking, the row starts with the place of the item.
function ItemRow({ item, rank, category, onFinish, ...swipe }: ItemRowProps) {
  return (
    <SwipeRow className="item" style={{ '--color': category.color } as CSSProperties} {...swipe}>
      {rank !== undefined && <span className="rank">{rank}</span>}
      <button className="info" onClick={swipe.onEdit}>
        <span className="title">
          {item.title}
          {item.year && <span className="year"> {item.year}</span>}
        </span>
        <span className="meta">{[category.name, dates(item)].filter(Boolean).join(' · ')}</span>
      </button>
      {item.rating && (
        <span className="rating" aria-label={`Rating ${item.rating} of ${MAX_RATING}`}>
          <Icon name="star" size={16} filled />
          {item.rating}
        </span>
      )}
      {item.status ? (
        <span
          className={`state ${item.status}`}
          role="img"
          aria-label={STATUS_LABELS[item.status]}
          title={STATUS_LABELS[item.status]}
        >
          <Icon name={item.status === 'completed' ? 'check' : 'close'} />
        </span>
      ) : (
        <button
          className="finish"
          onClick={onFinish}
          aria-label={`Complete ${item.title} today`}
          title="Complete today"
        >
          <Icon name="check" />
        </button>
      )}
    </SwipeRow>
  );
}

function SheetFrame(props: {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.onCancel]);

  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit();
        }}
      >
        <h2>{props.title}</h2>
        {props.children}
      </form>
    </div>
  );
}

// A delete button that needs a second tap.
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button type="button" className="delete" onClick={() => (armed ? onDelete() : setArmed(true))}>
      {armed ? label : 'Delete'}
    </button>
  );
}

interface ItemFormProps {
  item?: Item;
  categories: Category[];
  defaultCategory: string;
  onSave: (fields: ItemFields) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// An optional day: a date field with a button that removes the day, or a
// button that sets the day to today.
function DayField({ label, value, onChange }: { label: string; value: Day; onChange: (v: Day) => void }) {
  return (
    <label>
      {label}
      {value ? (
        <span className="day">
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
          <button
            type="button"
            className="clear"
            onClick={() => onChange('')}
            aria-label={`Remove the ${label.toLowerCase()} day`}
            title={`Remove the ${label.toLowerCase()} day`}
          >
            <Icon name="close" size={18} />
          </button>
        </span>
      ) : (
        <button type="button" className="today" onClick={() => onChange(today())}>
          Set to today
        </button>
      )}
    </label>
  );
}

// Add or edit an item: the title, the optional year of the work, the
// category, the optional start day, the completed state with the optional end
// day, the optional rating and an optional note.
function ItemForm({ item, categories, defaultCategory, onSave, onCancel, onDelete }: ItemFormProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [year, setYear] = useState(item?.year ? String(item.year) : '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategory);
  const [start, setStart] = useState(item ? (item.start ?? '') : today());
  const [status, setStatus] = useState<Status | null>(item?.status ?? null);
  const [end, setEnd] = useState(item?.end ?? '');
  const [rating, setRating] = useState(item?.rating ?? 0);
  const [note, setNote] = useState(item?.note ?? '');
  const reversed = !!status && !!start && !!end && end < start;
  const valid =
    title.trim() !== '' &&
    categories.some((c) => c.id === categoryId) &&
    (!year || /^\d{4}$/.test(year)) &&
    !reversed;

  const selectStatus = (next: Status | null) => {
    // A new end is today, or the start when the start is after today.
    if (next && !status && !end) setEnd(start && today() < start ? start : today());
    setStatus(next);
  };

  return (
    <SheetFrame
      title={item ? 'Edit item' : 'New item'}
      onCancel={onCancel}
      onSubmit={() =>
        valid &&
        onSave({
          title: title.trim(),
          categoryId,
          year: Number(year) || undefined,
          start: start || undefined,
          status: status ?? undefined,
          end: end || undefined,
          rating: rating || undefined,
          note: note.trim() || undefined,
        })
      }
    >
      <div className="title-year">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!item} />
        </label>
        <label>
          Year
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
          />
        </label>
      </div>
      <div className="chips" role="radiogroup" aria-label="Category">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === categoryId}
            style={{ '--color': c.color } as CSSProperties}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="segments" role="radiogroup" aria-label="Status">
        {STATUSES.map((st) => (
          <button
            key={st ?? 'ongoing'}
            type="button"
            role="radio"
            aria-checked={status === st}
            onClick={() => selectStatus(st)}
          >
            {st ? STATUS_LABELS[st] : 'Ongoing'}
          </button>
        ))}
      </div>
      <div className="dates">
        <DayField label="Start" value={start} onChange={setStart} />
        {status && <DayField label="End" value={end} onChange={setEnd} />}
      </div>
      {reversed && <p className="error">The end is before the start.</p>}
      <div className="rating-field">
        <span className="rating-label">
          Rating
          <strong>{rating ? `${rating} / ${MAX_RATING}` : 'None'}</strong>
        </span>
        <div className="scale" role="radiogroup" aria-label="Rating">
          {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} of ${MAX_RATING}`}
              className={n <= rating ? 'on' : undefined}
              // A tap on the current rating removes the rating.
              onClick={() => setRating(n === rating ? 0 : n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <label>
        Note
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </label>
      <div className="buttons">
        {onDelete && <DeleteButton label="Tap to delete" onDelete={onDelete} />}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!valid}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

interface CategoryListProps {
  data: Data;
  onSelect: (id: string | null) => void;
  onMove: (from: number, to: number) => void;
  onClose: () => void;
}

// The categories with the number of items of each. A tap opens the category
// form. Drag the handle of a category up or down to move it; the arrow keys
// move the category of the focused handle.
function CategoryList({ data, onSelect, onMove, onClose }: CategoryListProps) {
  const categories = data.categories;
  // The dragged category, the pointer position at which its row is at rest,
  // and the current pointer position.
  const [drag, setDrag] = useState<{ id: string; origin: number; y: number } | null>(null);
  const rows = useRef<HTMLDivElement>(null);

  // The distance between the tops of two rows in pixels.
  const step = () => {
    const list = rows.current;
    const row = list?.firstElementChild as HTMLElement | null;
    if (!list || !row) return 1;
    return row.offsetHeight + parseFloat(getComputedStyle(list).rowGap || '0');
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const index = categories.findIndex((c) => c.id === drag.id);
    const s = step();
    let origin = drag.origin;
    let to = index;
    while (e.clientY - origin > s / 2 && to < categories.length - 1) {
      origin += s;
      to++;
    }
    while (e.clientY - origin < -s / 2 && to > 0) {
      origin -= s;
      to--;
    }
    if (to !== index) onMove(index, to);
    setDrag({ id: drag.id, origin, y: e.clientY });
  };

  const onKeyDown = (e: ReactKeyboardEvent, index: number) => {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1;
    if (to < 0 || to >= categories.length) return;
    e.preventDefault();
    onMove(index, to);
  };

  return (
    <SheetFrame title="Categories" onCancel={onClose} onSubmit={() => onSelect(null)}>
      <div className="choices" ref={rows}>
        {categories.map((c, index) => {
          const dragged = drag?.id === c.id;
          return (
            <div
              key={c.id}
              className={dragged ? 'category-row dragged' : 'category-row'}
              style={{ transform: dragged ? `translateY(${drag.y - drag.origin}px)` : undefined }}
            >
              <button
                type="button"
                style={{ '--color': c.color } as CSSProperties}
                onClick={() => onSelect(c.id)}
              >
                <span>{c.name}</span>
                <small>{data.items.filter((i) => i.categoryId === c.id).length}</small>
              </button>
              {categories.length > 1 && (
                <button
                  type="button"
                  className="handle"
                  aria-label={`Move ${c.name}`}
                  title="Drag to move"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDrag({ id: c.id, origin: e.clientY, y: e.clientY });
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => setDrag(null)}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => onKeyDown(e, index)}
                >
                  <Icon name="grip" size={24} />
                </button>
              )}
            </div>
          );
        })}
        {categories.length === 0 && <p className="hint">No categories. Tap New category to add one.</p>}
      </div>
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Close
        </button>
        <button type="submit" className="primary">
          New category
        </button>
      </div>
    </SheetFrame>
  );
}

interface CategoryFormProps {
  category?: Category;
  color: string;
  // The number of items of the category.
  count: number;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// Add or edit a category. Deleting a category also deletes its items. For a
// category with items, Delete first shows a warning with the number of items,
// and a separate button in the warning deletes the category.
function CategoryForm({ category, count, onSave, onCancel, onDelete, ...props }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(props.color);
  const [warning, setWarning] = useState(false);
  const items = `${count} item${count === 1 ? '' : 's'}`;

  return (
    <SheetFrame
      title={category ? 'Edit category' : 'New category'}
      onCancel={onCancel}
      onSubmit={() => name.trim() && onSave(name.trim(), color)}
    >
      <label>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Books"
          autoFocus={!category}
        />
      </label>
      <div className="colors" role="radiogroup" aria-label="Color">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Color ${i + 1}`}
            className="swatch"
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {warning && onDelete && (
        <div className="warning" role="alert">
          <p>
            <strong>
              "{category?.name}" contains {items}.
            </strong>{' '}
            Deleting the category also deletes {count === 1 ? 'this item' : `all ${items}`}. You cannot undo
            this.
          </p>
          <div className="warning-buttons">
            <button type="button" onClick={() => setWarning(false)}>
              Keep
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              Delete all
            </button>
          </div>
        </div>
      )}
      <div className="buttons">
        {onDelete &&
          (count ? (
            <button type="button" className="delete" onClick={() => setWarning(true)} disabled={warning}>
              Delete
            </button>
          ) : (
            <DeleteButton label="Tap to delete" onDelete={onDelete} />
          ))}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!name.trim()}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

// Export all data of the app to a backup file, or replace all data with the
// data of a backup file. The import needs a second tap to replace the data.
function BackupSheet({ onClose }: { onClose: () => void }) {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [error, setError] = useState('');

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so that the same file can be selected again.
    e.target.value = '';
    if (!file) return;
    try {
      setBackup(readBackup(await file.text(), BACKUP_APP));
      setError('');
    } catch (err) {
      setBackup(null);
      setError(err instanceof Error ? err.message : 'The file is not a valid backup.');
    }
  };

  return (
    <SheetFrame title="Backup" onCancel={onClose} onSubmit={onClose}>
      <p className="hint">Export all data to a file. Import the file on the new phone.</p>
      <div className="file-buttons">
        <button
          type="button"
          className="file-button"
          onClick={() => exportBackup(BACKUP_APP, isDataKey)}
          title="Export all data to a file"
        >
          <Icon name="download" size={18} />
          Export
        </button>
        <label className="file-button" title="Import all data from a file">
          <Icon name="upload" size={18} />
          Import
          <input type="file" accept="application/json,.json" hidden onChange={importFile} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {backup && (
        <button
          type="button"
          className="replace"
          onClick={() => {
            restoreBackup(backup, isDataKey);
            location.reload();
          }}
        >
          Tap to replace all data
          <small>Backup of {new Date(backup.exported).toLocaleString()}</small>
        </button>
      )}
      <div className="buttons">
        <button type="submit" className="primary">
          Close
        </button>
      </div>
    </SheetFrame>
  );
}
