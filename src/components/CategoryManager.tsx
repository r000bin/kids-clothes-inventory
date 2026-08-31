import { useState } from 'react'
import type { CategorySort } from '../lib/constants'
import { useI18n } from '../lib/i18n'

type Props = {
  categories: string[]
  counts: Map<string, number>
  sort: CategorySort
  onSort: (sort: CategorySort) => void
  onSave: (list: string[]) => void
  onRename: (from: string, to: string) => void
  onClose: () => void
}

/**
 * Edit the shared category list: rename (existing entries follow), reorder,
 * add and remove terms, and pick how the form's picker is sorted.
 */
export function CategoryManager({ categories, counts, sort, onSort, onSave, onRename, onClose }: Props) {
  const { t } = useI18n()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function move(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= categories.length) return
    const next = [...categories]
    ;[next[i], next[j]] = [next[j], next[i]]
    onSave(next)
  }

  function commitRename(from: string, raw: string): boolean {
    const to = raw.trim()
    if (!to || to === from) return false
    if (categories.some((c) => c !== from && c.toLowerCase() === to.toLowerCase())) {
      setError(t('duplicateCategory'))
      return false
    }
    setError(null)
    onRename(from, to)
    return true
  }

  function remove(c: string) {
    if (!confirm(t('deleteCategoryConfirm', { c }))) return
    onSave(categories.filter((x) => x !== c))
  }

  function add() {
    const name = newName.trim()
    if (!name) return
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError(t('duplicateCategory'))
      return
    }
    setError(null)
    onSave([...categories, name])
    setNewName('')
  }

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
            <div className="seg">
              {(['custom', 'alpha', 'freq'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={s === sort ? 'on' : ''}
                  onClick={() => onSort(s)}
                >
                  {s === 'custom' ? t('sortCustom') : s === 'alpha' ? t('sortAlpha') : t('sortFreq')}
                </button>
              ))}
            </div>
          </label>

          <ul className="cat-list">
            {categories.map((c, i) => (
              <li key={c} className="cat-row">
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
                {sort === 'custom' && (
                  <>
                    <button
                      type="button"
                      aria-label={t('moveUp')}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={t('moveDown')}
                      disabled={i === categories.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                  </>
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
