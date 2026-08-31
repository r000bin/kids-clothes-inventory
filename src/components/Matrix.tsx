import { useMemo } from 'react'
import { compareSizes, sizeRank } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import type { Item } from '../lib/types'

type Props = {
  items: Item[]
  minSize: string
  onCell: (category: string, size: string) => void
}

/**
 * Categories down the side, sizes across the top. This is the view that answers
 * "she has grown out of 110 - what do we already have in 116?" at a glance.
 */
export function Matrix({ items, minSize, onCell }: Props) {
  const { t, lang, categoryLabel } = useI18n()
  const { sizes, categories, cells } = useMemo(() => {
    const sizeSet = new Set<string>()
    const categorySet = new Set<string>()
    const cellMap = new Map<string, number>()
    for (const item of items) {
      sizeSet.add(item.size)
      categorySet.add(item.category)
      const key = `${item.category}\u0000${item.size}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + item.quantity)
    }
    return {
      sizes: [...sizeSet].sort(compareSizes),
      categories: [...categorySet].sort((a, b) =>
        categoryLabel(a).localeCompare(categoryLabel(b), lang),
      ),
      cells: cellMap,
    }
  }, [items, lang, categoryLabel])

  if (sizes.length === 0) {
    return <p className="empty">{t('emptyList')}</p>
  }

  const minRank = minSize ? sizeRank(minSize) : -1

  return (
    <div className="matrix-scroll">
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner" />
            {sizes.map((s) => (
              <th key={s} className={minRank >= 0 && sizeRank(s) < minRank ? 'outgrown' : undefined}>
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c}>
              <th className="rowhead">{categoryLabel(c)}</th>
              {sizes.map((s) => {
                const n = cells.get(`${c}\u0000${s}`) ?? 0
                return (
                  <td
                    key={s}
                    className={n === 0 ? 'zero' : minRank >= 0 && sizeRank(s) < minRank ? 'outgrown' : 'has'}
                    onClick={() => n > 0 && onCell(c, s)}
                  >
                    {n === 0 ? '·' : n}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
