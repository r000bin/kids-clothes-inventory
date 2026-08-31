import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { deletePhoto } from './photos'
import { DEFAULT_CATEGORIES, LEGACY_CATEGORY_DE, type CategorySort } from './constants'
import type { Item, ItemDraft } from './types'

/** Update a settings row; create it if the schema seed hasn't been run yet. */
async function writeSetting(key: string, value: string) {
  const { data, error } = await supabase
    .from('settings')
    .update({ value })
    .eq('key', key)
    .select('key')
  if (error) throw error
  if (data.length === 0) {
    const { error: insErr } = await supabase.from('settings').insert({ key, value })
    if (insErr) throw insErr
  }
}

export function useInventory() {
  const [items, setItems] = useState<Item[]>([])
  const [minSize, setMinSizeState] = useState('')
  const [categories, setCategoriesState] = useState<string[]>(DEFAULT_CATEGORIES)
  const [categorySort, setCategorySortState] = useState<CategorySort>('custom')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seeding = useRef(false)

  const categoriesRef = useRef(categories)
  categoriesRef.current = categories

  const reload = useCallback(async () => {
    const [itemsRes, settingsRes] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('settings').select('key, value'),
    ])
    let loadedItems: Item[] = []
    if (itemsRes.error) {
      setError(itemsRes.error.message)
    } else {
      loadedItems = itemsRes.data as Item[]
      setItems(loadedItems)
      setError(null)
    }
    if (!settingsRes.error) {
      const map = new Map((settingsRes.data ?? []).map((r) => [r.key as string, (r.value ?? '') as string]))
      setMinSizeState(map.get('min_size') ?? '')
      const sort = map.get('category_sort')
      setCategorySortState(sort === 'alpha' || sort === 'freq' ? sort : 'custom')

      let cats: string[] | null = null
      const raw = map.get('categories')
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw)
          if (Array.isArray(parsed)) cats = parsed.filter((c): c is string => typeof c === 'string')
        } catch {
          // unreadable value: treat as unseeded
        }
      }
      if (cats && cats.length > 0) {
        setCategoriesState(cats)
      } else if (!seeding.current) {
        // First run after the update: store the default list, and move existing
        // entries from the old English names to the German names they were
        // already being displayed as.
        seeding.current = true
        try {
          await writeSetting('categories', JSON.stringify(DEFAULT_CATEGORIES))
          const present = new Set(loadedItems.map((i) => i.category))
          for (const [legacy, name] of Object.entries(LEGACY_CATEGORY_DE)) {
            if (legacy === name || !present.has(legacy)) continue
            const { error: err } = await supabase
              .from('items')
              .update({ category: name })
              .eq('category', legacy)
            if (!err) {
              setItems((prev) =>
                prev.map((it) => (it.category === legacy ? { ...it, category: name } : it)),
              )
            }
          }
        } catch {
          // Settings row missing and not insertable (schema.sql not re-run yet).
          // The app keeps working with the built-in defaults; edits won't stick.
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Keep both phones in sync without a manual refresh.
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  useEffect(() => {
    const channel = supabase
      .channel('inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        void reloadRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        void reloadRef.current()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const addItem = useCallback(async (draft: ItemDraft) => {
    const { data, error: err } = await supabase.from('items').insert(draft).select().single()
    if (err) throw err
    setItems((prev) => [...prev, data as Item])
  }, [])

  const updateItem = useCallback(async (id: string, patch: Partial<ItemDraft>) => {
    const { data, error: err } = await supabase
      .from('items')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    setItems((prev) => prev.map((it) => (it.id === id ? (data as Item) : it)))
  }, [])

  const removeItem = useCallback(async (item: Item) => {
    const { error: err } = await supabase.from('items').delete().eq('id', item.id)
    if (err) throw err
    if (item.photo_path) await deletePhoto(item.photo_path)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
  }, [])

  /** +/- straight from the list, for when a pile gets sorted or handed on. */
  const adjustQuantity = useCallback(
    async (item: Item, delta: number) => {
      const next = Math.max(0, item.quantity + delta)
      if (next === item.quantity) return
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, quantity: next } : it)),
      )
      const { error: err } = await supabase
        .from('items')
        .update({ quantity: next })
        .eq('id', item.id)
      if (err) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, quantity: item.quantity } : it)),
        )
        setError(err.message)
      }
    },
    [],
  )

  const setMinSize = useCallback(async (size: string) => {
    setMinSizeState(size)
    try {
      await writeSetting('min_size', size)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  /** Persist a new category list (order, additions, deletions). */
  const saveCategories = useCallback(async (next: string[]) => {
    setCategoriesState(next)
    try {
      await writeSetting('categories', JSON.stringify(next))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const setCategorySort = useCallback(async (sort: CategorySort) => {
    setCategorySortState(sort)
    try {
      await writeSetting('category_sort', sort)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  /** Rename a term everywhere: in the list and on every existing entry. */
  const renameCategory = useCallback(async (from: string, to: string) => {
    const next = categoriesRef.current.map((c) => (c === from ? to : c))
    setCategoriesState(next)
    setItems((prev) => prev.map((it) => (it.category === from ? { ...it, category: to } : it)))
    try {
      const { error: err } = await supabase
        .from('items')
        .update({ category: to })
        .eq('category', from)
      if (err) throw err
      await writeSetting('categories', JSON.stringify(next))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  return {
    items,
    minSize,
    categories,
    categorySort,
    loading,
    error,
    reload,
    addItem,
    updateItem,
    removeItem,
    adjustQuantity,
    setMinSize,
    saveCategories,
    setCategorySort,
    renameCategory,
  }
}
