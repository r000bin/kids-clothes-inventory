import { useMemo, useState } from 'react'
import { compareSizes, sizeRank } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import type { Item } from '../lib/types'
import { Thumb } from './Thumb'

type Props = {
  items: Item[]
  minSize: string
  compareCategories: (a: string, b: string) => number
  onEdit: (item: Item) => void
  onAdjust: (item: Item, delta: number) => void
}

export function ItemList({ items, minSize, compareCategories, onEdit, onAdjust }: Props) {
  const { t, categoryLabel } = useI18n()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const bySize = new Map<string, Item[]>()
    for (const item of items) {
      const list = bySize.get(item.size)
      if (list) list.push(item)
      else bySize.set(item.size, [item])
    }
    return [...bySize.entries()]
      .sort((a, b) => compareSizes(a[0], b[0]))
      .map(([size, group]) => ({
        size,
        items: group.sort((a, b) => compareCategories(a.category, b.category)),
        total: group.reduce((sum, it) => sum + it.quantity, 0),
      }))
  }, [items, compareCategories])

  if (groups.length === 0) {
    return <p className="empty">{t('emptyList')}</p>
  }

  const minRank = minSize ? sizeRank(minSize) : -1

  return (
    <div className="list">
      {groups.map(({ size, items: group, total }) => {
        const outgrown = minRank >= 0 && sizeRank(size) < minRank
        const isOpen = !collapsed[size]
        return (
          <section key={size} className={outgrown ? 'size-group outgrown' : 'size-group'}>
            <button
              className="size-head"
              onClick={() => setCollapsed((c) => ({ ...c, [size]: isOpen }))}
            >
              <span className="chev">{isOpen ? '▾' : '▸'}</span>
              <span className="size-name">{t('sizeHeading', { s: size })}</span>
              {outgrown && <span className="badge">{t('passOnBadge')}</span>}
              <span className="size-total">{total}</span>
            </button>
            {isOpen && (
              <ul>
                {group.map((item) => (
                  <li key={item.id} className="row">
                    <button className="row-main" onClick={() => onEdit(item)}>
                      {item.photo_path ? (
                        <Thumb path={item.photo_path} alt={categoryLabel(item.category)} className="thumb" />
                      ) : (
                        <div className="thumb thumb-empty" />
                      )}
                      <span className="row-text">
                        <span className="row-title">{categoryLabel(item.category)}</span>
                        <span className="row-sub">
                          {[item.location, item.notes].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </span>
                    </button>
                    <div className="qty">
                      <button
                        aria-label={t('oneFewer', { c: categoryLabel(item.category) })}
                        onClick={() => onAdjust(item, -1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={t('oneMore', { c: categoryLabel(item.category) })}
                        onClick={() => onAdjust(item, 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
