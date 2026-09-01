import { useMemo, useState, type PointerEvent } from 'react'
import type { CategorySort } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { SortPicker } from './SortPicker'

type Props = {
  categories: string[]
  counts: Map<string, number>
  sort: CategorySort
  onSort: (sort: CategorySort) => Promise<void>
  onSave: (list: string[]) => Promise<void>
  onRename: (from: string, to: string) => Promise<void>
  onClose: () => void
}

/**
 * Edit the shared category list: rename (existing entries follow), reorder by
 * dragging or "to top", add and remove terms, and pick how the list is sorted.
 */
export function CategoryManager({ categories, counts, sort, onSort, onSave, onRename, onClose }: Props) {
  const { t, lang, categoryLabel } = useI18n()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // While a drag is in progress the working order lives here, so the list
  // rearranges under the finger and is saved once on release.
  const [dragging, setDragging] = useState<string | null>(null)
  const [work, setWork] = useState<string[] | null>(null)

  const shown = useMemo(() => {
    if (sort === 'alpha') {
      return [...categories].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), lang))
    }
    if (sort === 'freq') {
      return [...categories].sort(
        (a, b) =>
          (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
          categoryLabel(a).localeCompare(categoryLabel(b), lang),
      )
    }
    return work ?? categories
  }, [categories, sort, counts, categoryLabel, lang, work])

  function run(action: Promise<void>) {
    setError(null)
    action.catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }

  function toTop(c: string) {
    run(onSave([c, ...categories.filter((x) => x !== c)]))
  }

  function commitRename(from: string, raw: string): boolean {
    const to = raw.trim()
    if (!to || to === from) return false
    if (categories.some((c) => c !== from && c.toLowerCase() === to.toLowerCase())) {
      setError(t('duplicateCategory'))
      return false
    }
    run(onRename(from, to))
    return true
  }

  function remove(c: string) {
    if (!confirm(t('deleteCategoryConfirm', { c }))) return
    run(onSave(categories.filter((x) => x !== c)))
  }

  function add() {
    const name = newName.trim()
    if (!name) return
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError(t('duplicateCategory'))
      return
    }
    run(onSave([...categories, name]))
    setNewName('')
  }

  function dragStart(e: PointerEvent<HTMLButtonElement>, c: string) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(c)
    setWork(categories)
  }

  function dragMove(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging || !work) return
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-term]')
    const over = el?.dataset.term
    if (!over || over === dragging) return
    const from = work.indexOf(dragging)
    const to = work.indexOf(over)
    if (from === -1 || to === -1) return
    const next = [...work]
    next.splice(from, 1)
    next.splice(to, 0, dragging)
    setWork(next)
  }

  function dragEnd() {
    if (work && work.some((c, i) => c !== categories[i])) run(onSave(work))
    setDragging(null)
    setWork(null)
  }

  const canDrag = sort === 'custom'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <strong>{t('categoriesTitle')}</strong>
          <button type="button" className="link strong" onClick={onClose}>
            {t('done')}
          </button>
        </header>

        <div className="sheet-body">
          <label>
            {t('sortLabel')}
            <SortPicker value={sort} onChange={(s) => run(onSort(s))} />
          </label>
          {canDrag && <p className="muted small hint">{t('dragHint')}</p>}

          <ul className="cat-list">
            {shown.map((c) => (
              <li
                key={c}
                data-term={c}
                className={c === dragging ? 'cat-row dragging' : 'cat-row'}
              >
                {canDrag && (
                  <button
                    type="button"
                    className="cat-handle"
                    aria-label={t('dragHandle')}
                    onPointerDown={(e) => dragStart(e, c)}
                    onPointerMove={dragMove}
                    onPointerUp={dragEnd}
                    onPointerCancel={dragEnd}
                  >
                    ⠿
                  </button>
                )}
                <input
                  defaultValue={c}
                  onBlur={(e) => {
                    if (!commitRename(c, e.target.value)) e.target.value = c
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
                <span className="cat-count">{counts.get(c) ?? 0}</span>
                {canDrag && (
                  <button
                    type="button"
                    aria-label={t('moveToTop')}
                    disabled={categories[0] === c}
                    onClick={() => toTop(c)}
                  >
                    ⤒
                  </button>
                )}
                <button
                  type="button"
                  className="cat-del"
                  aria-label={t('deleteEntry')}
                  onClick={() => remove(c)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="cat-add">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('newCategoryPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
            />
            <button type="button" className="button" onClick={add}>
              {t('addCategoryAction')}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
