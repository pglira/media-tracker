import { type ChangeEvent, type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { type Backup, exportBackup, readBackup, restoreBackup } from './backup';
import { Icon, type IconName } from './icons';
import {
  BACKUP_APP,
  COLORS,
  type Category,
  type Data,
  type Item,
  type ItemFields,
  MAX_RATING,
  duration,
  finishItem,
  finishedByYear,
  inProgress,
  isDataKey,
  loadData,
  nextColor,
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

export default function App() {
  const [data, setData] = useState<Data>(loadData);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the shown category, or null for all categories.
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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
      (!text || i.title.toLowerCase().includes(text) || i.note?.toLowerCase().includes(text)),
  );
  const current = inProgress(shown);
  const years = finishedByYear(shown);
  const sheetItem = sheet?.kind === 'item' ? data.items.find((i) => i.id === sheet.id) : undefined;
  const sheetCategory = sheet?.kind === 'category' ? category(sheet.id ?? '') : undefined;

  const row = (item: Item) => (
    <ItemRow
      key={item.id}
      item={item}
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
        <input
          className="search"
          type="search"
          placeholder="Search"
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {data.items.length === 0 && <p className="empty">No items. Tap + to add a movie, a book or a game.</p>}
      {data.items.length > 0 && shown.length === 0 && <p className="empty">No items match.</p>}

      {current.length > 0 && (
        <section>
          <h2 className="group">
            In progress <span>{current.length}</span>
          </h2>
          <ul>{current.map(row)}</ul>
        </section>
      )}

      {years.map(([year, items]) => (
        <section key={year}>
          <h2 className="group">
            Finished {year} <span>{items.length}</span>
          </h2>
          <ul>{items.map(row)}</ul>
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
        <CategoryList data={data} onSelect={(id) => setSheet({ kind: 'category', id })} onClose={close} />
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

// The dates of an item: the start and the end with the number of days, or
// the start only while the item is in progress.
function dates(item: Item): string {
  if (!item.end) return `Since ${shortDate(item.start)}`;
  const days = duration(item.start, item.end);
  if (days === 1) return shortDate(item.end);
  return `${shortDate(item.start)} – ${shortDate(item.end)} · ${days} days`;
}

interface ItemRowProps {
  item: Item;
  category: Category;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFinish: () => void;
}

// One item in the list. A tap opens the item form. An item in progress has a
// button that finishes it today; a finished item shows its rating.
function ItemRow({ item, category, onFinish, ...swipe }: ItemRowProps) {
  return (
    <SwipeRow className="item" style={{ '--color': category.color } as CSSProperties} {...swipe}>
      <button className="info" onClick={swipe.onEdit}>
        <span className="title">{item.title}</span>
        <span className="meta">
          {category.name} · {dates(item)}
        </span>
      </button>
      {item.end ? (
        item.rating ? (
          <span className="rating" aria-label={`Rating ${item.rating} of ${MAX_RATING}`}>
            <Icon name="star" size={16} filled />
            {item.rating}
          </span>
        ) : null
      ) : (
        <button
          className="finish"
          onClick={onFinish}
          aria-label={`Finish ${item.title} today`}
          title="Finish today"
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

// Add or edit an item: the title, the category, the start day, the optional
// end day, the optional rating and an optional note.
function ItemForm({ item, categories, defaultCategory, onSave, onCancel, onDelete }: ItemFormProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategory);
  const [start, setStart] = useState(item?.start ?? today());
  const [end, setEnd] = useState(item?.end ?? '');
  const [rating, setRating] = useState(item?.rating ?? 0);
  const [note, setNote] = useState(item?.note ?? '');
  const valid =
    title.trim() !== '' &&
    categories.some((c) => c.id === categoryId) &&
    start !== '' &&
    (!end || end >= start);

  return (
    <SheetFrame
      title={item ? 'Edit item' : 'New item'}
      onCancel={onCancel}
      onSubmit={() =>
        valid &&
        onSave({
          title: title.trim(),
          categoryId,
          start,
          end: end || undefined,
          rating: rating || undefined,
          note: note.trim() || undefined,
        })
      }
    >
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!item} />
      </label>
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
      <div className="dates">
        <label>
          Start
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          {end ? (
            <span className="end">
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
              <button
                type="button"
                className="clear"
                onClick={() => setEnd('')}
                aria-label="Remove the end day"
                title="Remove the end day"
              >
                <Icon name="close" size={18} />
              </button>
            </span>
          ) : (
            <button type="button" className="today" onClick={() => setEnd(today() < start ? start : today())}>
              Finish today
            </button>
          )}
        </label>
      </div>
      {end && end < start && <p className="error">The end is before the start.</p>}
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

// The categories with the number of items of each. A tap opens the category
// form.
function CategoryList({
  data,
  onSelect,
  onClose,
}: {
  data: Data;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <SheetFrame title="Categories" onCancel={onClose} onSubmit={() => onSelect(null)}>
      <div className="choices">
        {data.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            style={{ '--color': c.color } as CSSProperties}
            onClick={() => onSelect(c.id)}
          >
            <span>{c.name}</span>
            <small>{data.items.filter((i) => i.categoryId === c.id).length}</small>
          </button>
        ))}
        {data.categories.length === 0 && <p className="hint">No categories. Tap New category to add one.</p>}
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
