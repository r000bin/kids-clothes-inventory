import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { SIZES, sizeRank } from './lib/constants'
import { LangSwitcher, useI18n } from './lib/i18n'
import { useInventory } from './lib/useInventory'
import type { Item, ItemDraft } from './lib/types'
import { Auth } from './components/Auth'
import { CategoryManager } from './components/CategoryManager'
import { ItemForm } from './components/ItemForm'
import { ItemList } from './components/ItemList'
import { Matrix } from './components/Matrix'

type Tab = 'list' | 'matrix'
type Editing = { item: Item | null } | null

export default function App() {
  const { t } = useI18n()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setReady(true)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <Setup />
  if (!ready) return <div className="splash">{t('loading')}</div>
  if (!session) return <Auth />
  return <Inventory />
}

function Setup() {
  return (
    <div className="auth">
      <div className="card auth-card">
        <h1>Almost there</h1>
        <p>
          Create a <code>.env</code> file next to <code>package.json</code> with your Supabase
          project URL and anon key, then restart <code>npm run dev</code>. See{' '}
          <code>.env.example</code> and the README.
        </p>
      </div>
    </div>
  )
}

function Inventory() {
  const { t, lang, categoryLabel } = useI18n()
  const {
    items,
    minSize,
    categories,
    categorySort,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    adjustQuantity,
    setMinSize,
    saveCategories,
    setCategorySort,
    renameCategory,
  } = useInventory()

  const [tab, setTab] = useState<Tab>('list')
  const [query, setQuery] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [passOnOnly, setPassOnOnly] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [managingCategories, setManagingCategories] = useState(false)

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const item of items) m.set(item.category, (m.get(item.category) ?? 0) + 1)
    return m
  }, [items])

  // The category list in the order the picker should show it.
  const orderedCategories = useMemo(() => {
    const arr = [...categories]
    if (categorySort === 'alpha') {
      arr.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), lang))
    } else if (categorySort === 'freq') {
      arr.sort(
        (a, b) =>
          (categoryCounts.get(b) ?? 0) - (categoryCounts.get(a) ?? 0) ||
          categoryLabel(a).localeCompare(categoryLabel(b), lang),
      )
    }
    return arr
  }, [categories, categorySort, categoryCounts, categoryLabel, lang])

  // Same order for the list and the overview; terms no longer in the list
  // (e.g. deleted ones still on entries) go to the end, alphabetically.
  const compareCategories = useMemo(() => {
    const pos = new Map(orderedCategories.map((c, i) => [c, i]))
    return (a: string, b: string) => {
      const pa = pos.get(a) ?? Number.MAX_SAFE_INTEGER
      const pb = pos.get(b) ?? Number.MAX_SAFE_INTEGER
      if (pa !== pb) return pa - pb
      return categoryLabel(a).localeCompare(categoryLabel(b), lang)
    }
  }, [orderedCategories, categoryLabel, lang])

  const locations = useMemo(
    () => [...new Set(items.map((i) => i.location).filter((l): l is string => Boolean(l)))].sort(),
    [items],
  )

  const minRank = minSize ? sizeRank(minSize) : -1

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (sizeFilter && item.size !== sizeFilter) return false
      if (categoryFilter && item.category !== categoryFilter) return false
      if (passOnOnly && !(minRank >= 0 && sizeRank(item.size) < minRank)) return false
      if (!q) return true
      return [item.category, categoryLabel(item.category), item.size, item.location, item.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    })
  }, [items, query, sizeFilter, categoryFilter, passOnOnly, minRank, categoryLabel])

  const totals = useMemo(() => {
    let all = 0
    let passOn = 0
    for (const item of items) {
      all += item.quantity
      if (minRank >= 0 && sizeRank(item.size) < minRank) passOn += item.quantity
    }
    return { all, passOn }
  }, [items, minRank])

  const hasFilter = Boolean(query || sizeFilter || categoryFilter || passOnOnly)

  function clearFilters() {
    setQuery('')
    setSizeFilter('')
    setCategoryFilter('')
    setPassOnOnly(false)
  }

  async function save(draft: ItemDraft) {
    if (editing?.item) await updateItem(editing.item.id, draft)
    else await addItem(draft)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <h1>{t('appTitle')}</h1>
          <div className="topbar-actions">
            <LangSwitcher />
            <button className="link" onClick={() => void supabase.auth.signOut()}>
              {t('signOut')}
            </button>
          </div>
        </div>
        <div className="topbar-row">
          <label className="minsize">
            {t('minSizeLabel')}
            <select value={minSize} onChange={(e) => void setMinSize(e.target.value)}>
              <option value="">{t('notSet')}</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="summary">
          {t('pieces', { n: totals.all })}
          {minRank >= 0 && (
            <>
              {' · '}
              <button className="link" onClick={() => setPassOnOnly((v) => !v)}>
                {t('readyToPassOn', { n: totals.passOn })}
              </button>
            </>
          )}
        </p>
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {hasFilter && (
          <div className="chips">
            {sizeFilter && (
              <button className="chip" onClick={() => setSizeFilter('')}>
                {t('sizeChip', { s: sizeFilter })} ✕
              </button>
            )}
            {categoryFilter && (
              <button className="chip" onClick={() => setCategoryFilter('')}>
                {categoryLabel(categoryFilter)} ✕
              </button>
            )}
            {passOnOnly && (
              <button className="chip" onClick={() => setPassOnOnly(false)}>
                {t('passOnChip')} ✕
              </button>
            )}
            <button className="chip ghost" onClick={clearFilters}>
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>

      <main>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">{t('loading')}</p>
        ) : tab === 'list' ? (
          <ItemList
            items={filtered}
            minSize={minSize}
            compareCategories={compareCategories}
            onEdit={(item) => setEditing({ item })}
            onAdjust={(item, delta) => void adjustQuantity(item, delta)}
          />
        ) : (
          <Matrix
            items={filtered}
            minSize={minSize}
            compareCategories={compareCategories}
            onCell={(category, size) => {
              setCategoryFilter(category)
              setSizeFilter(size)
              setTab('list')
            }}
          />
        )}
      </main>

      <button className="fab" onClick={() => setEditing({ item: null })} aria-label={t('addEntry')}>
        +
      </button>

      <nav className="tabbar">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>
          {t('tabBySize')}
        </button>
        <button className={tab === 'matrix' ? 'on' : ''} onClick={() => setTab('matrix')}>
          {t('tabOverview')}
        </button>
      </nav>

      {editing && (
        <ItemForm
          item={editing.item}
          categories={orderedCategories}
          categorySort={categorySort}
          locations={locations}
          defaultSize={sizeFilter || undefined}
          onSave={save}
          onDelete={editing.item ? () => removeItem(editing.item!) : undefined}
          onSort={setCategorySort}
          onEditCategories={() => setManagingCategories(true)}
          onClose={() => setEditing(null)}
        />
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          counts={categoryCounts}
          sort={categorySort}
          onSort={setCategorySort}
          onSave={saveCategories}
          onRename={renameCategory}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </div>
  )
}
