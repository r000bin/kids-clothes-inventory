import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { deletePhoto } from './photos'
import type { Item, ItemDraft } from './types'

export function useInventory() {
  const [items, setItems] = useState<Item[]>([])
  const [minSize, setMinSizeState] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [itemsRes, settingsRes] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('settings').select('key, value').eq('key', 'min_size').maybeSingle(),
    ])
    if (itemsRes.error) {
      setError(itemsRes.error.message)
    } else {
      setItems(itemsRes.data as Item[])
      setError(null)
    }
    if (!settingsRes.error) setMinSizeState(settingsRes.data?.value ?? '')
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
    const { error: err } = await supabase
      .from('settings')
      .update({ value: size })
      .eq('key', 'min_size')
    if (err) setError(err.message)
  }, [])

  return {
    items,
    minSize,
    loading,
    error,
    reload,
    addItem,
    updateItem,
    removeItem,
    adjustQuantity,
    setMinSize,
  }
}
