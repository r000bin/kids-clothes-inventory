import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import { SIZES, sizeRank } from './lib/constants'
import { useInventory } from './lib/useInventory'
import type { Item, ItemDraft } from './lib/types'
import { Auth } from './components/Auth'
import { ItemForm } from './components/ItemForm'
import { ItemList } from './components/ItemList'
import { Matrix } from './components/Matrix'

type Tab = 'list' | 'matrix'
type Editing = { item: Item | null } | null

export default function App() {
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
  if (!ready) return <div className="splash">Loading…</div>
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
  const {
    items,
    minSize,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    adjustQuantity,
    setMinSize,
  } = useInventory()

  const [tab, setTab] = useState<Tab>('list')
  const [query, setQuery] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [passOnOnly, setPassOnOnly] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)

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
      return [item.category, item.size, item.location, item.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    })
  }, [items, query, sizeFilter, categoryFilter, passOnOnly, minRank])

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
          <h1>Clothes Inventory</h1>
          <button className="link" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
        <div className="topbar-row">
          <label className="minsize">
            Smallest size still worn
            <select value={minSize} onChange={(e) => void setMinSize(e.target.value)}>
              <option value="">— not set —</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="summary">
          {totals.all} pieces
          {minRank >= 0 && (
            <>
              {' · '}
              <button className="link" onClick={() => setPassOnOnly((v) => !v)}>
                {totals.passOn} ready to pass on
              </button>
            </>
          )}
        </p>
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder="Search category, box, note…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {hasFilter && (
          <div className="chips">
            {sizeFilter && (
              <button className="chip" onClick={() => setSizeFilter('')}>
                Size {sizeFilter} ✕
              </button>
            )}
            {categoryFilter && (
              <button className="chip" onClick={() => setCategoryFilter('')}>
                {categoryFilter} ✕
              </button>
            )}
            {passOnOnly && (
              <button className="chip" onClick={() => setPassOnOnly(false)}>
                Ready to pass on ✕
              </button>
            )}
            <button className="chip ghost" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <main>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : tab === 'list' ? (
          <ItemList
            items={filtered}
            minSize={minSize}
            onEdit={(item) => setEditing({ item })}
            onAdjust={(item, delta) => void adjustQuantity(item, delta)}
          />
        ) : (
          <Matrix
            items={filtered}
            minSize={minSize}
            onCell={(category, size) => {
              setCategoryFilter(category)
              setSizeFilter(size)
              setTab('list')
            }}
          />
        )}
      </main>

      <button className="fab" onClick={() => setEditing({ item: null })} aria-label="Add entry">
        +
      </button>

      <nav className="tabbar">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>
          By size
        </button>
        <button className={tab === 'matrix' ? 'on' : ''} onClick={() => setTab('matrix')}>
          Overview
        </button>
      </nav>

      {editing && (
        <ItemForm
          item={editing.item}
          locations={locations}
          defaultSize={sizeFilter || undefined}
          onSave={save}
          onDelete={editing.item ? () => removeItem(editing.item!) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
