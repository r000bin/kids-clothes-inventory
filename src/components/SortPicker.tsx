import type { CategorySort } from '../lib/constants'
import { useI18n } from '../lib/i18n'

type Props = {
  value: CategorySort
  onChange: (sort: CategorySort) => void
}

/** Eigene / A–Z / Häufigste — shared by the entry form and the term editor. */
export function SortPicker({ value, onChange }: Props) {
  const { t } = useI18n()
  return (
    <div className="seg" role="group" aria-label={t('sortLabel')}>
      {(['custom', 'alpha', 'freq'] as const).map((s) => (
        <button
          key={s}
          type="button"
          className={s === value ? 'on' : ''}
          onClick={() => onChange(s)}
        >
          {s === 'custom' ? t('sortCustom') : s === 'alpha' ? t('sortAlpha') : t('sortFreq')}
        </button>
      ))}
    </div>
  )
}
