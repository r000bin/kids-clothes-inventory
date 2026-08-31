import { useState, type FormEvent } from 'react'
import { SIZES } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { deletePhoto, uploadPhoto } from '../lib/photos'
import type { Item, ItemDraft } from '../lib/types'
import { Thumb } from './Thumb'

const CUSTOM = '__custom__'

type Props = {
  item: Item | null
  categories: string[]
  locations: string[]
  defaultSize?: string
  onSave: (draft: ItemDraft) => Promise<void>
  onDelete?: () => Promise<void>
  onEditCategories: () => void
  onClose: () => void
}

export function ItemForm({
  item,
  categories,
  locations,
  defaultSize,
  onSave,
  onDelete,
  onEditCategories,
  onClose,
}: Props) {
  const { t, categoryLabel } = useI18n()
  const knownCategory = !item || categories.includes(item.category)
  const [category, setCategory] = useState(
    item ? (knownCategory ? item.category : CUSTOM) : categories[0] ?? CUSTOM,
  )
  const [customCategory, setCustomCategory] = useState(knownCategory ? '' : item!.category)
  const [size, setSize] = useState(item?.size ?? defaultSize ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? 1)
  const [location, setLocation] = useState(item?.location ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedCategory = category === CUSTOM ? customCategory.trim() : category

  async function submit(addAnother: boolean) {
    if (!resolvedCategory || !size) {
      setError(t('needCategoryAndSize'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      let nextPhoto = photoPath
      if (photoFile) {
        nextPhoto = await uploadPhoto(photoFile)
        if (item?.photo_path && item.photo_path !== nextPhoto) {
          await deletePhoto(item.photo_path)
        }
      } else if (item?.photo_path && !photoPath) {
        await deletePhoto(item.photo_path)
      }
      await onSave({
        category: resolvedCategory,
        size,
        quantity,
        location: location.trim() || null,
        notes: notes.trim() || null,
        photo_path: nextPhoto,
      })
      if (addAnother) {
        // Same box, next piece: keep category, size and location,
        // clear what is specific to the piece just saved.
        setQuantity(1)
        setNotes('')
        setPhotoFile(null)
        setPhotoPath(null)
        setBusy(false)
        setFlash(true)
        window.setTimeout(() => setFlash(false), 1600)
      } else {
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void submit(false)
  }

  async function onDeleteClick() {
    if (!onDelete) return
    if (!confirm(t('confirmDelete'))) return
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <header className="sheet-head">
          <button type="button" className="link" onClick={onClose}>
            {t('cancel')}
          </button>
          <strong>{item ? t('editEntry') : t('newEntry')}</strong>
          <button type="submit" className="link strong" disabled={busy}>
            {busy ? t('saving') : t('save')}
          </button>
        </header>

        <div className="sheet-body">
          <label>
            <span className="label-row">
              {t('whatIsIt')}
              <button
                type="button"
                className="link small"
                onClick={(e) => {
                  e.preventDefault()
                  onEditCategories()
                }}
              >
                {t('editCategories')}
              </button>
            </span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
              <option value={CUSTOM}>{t('somethingElse')}</option>
            </select>
          </label>
          {category === CUSTOM && (
            <label>
              {t('nameIt')}
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('customPlaceholder')}
                autoFocus
              />
            </label>
          )}

          <label>
            {t('size')}
            <div className="size-grid">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={s === size ? 'size-chip on' : 'size-chip'}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>

          <label>
            {t('howMany')}
            <div className="stepper">
              <button type="button" onClick={() => setQuantity((q) => Math.max(0, q - 1))}>
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
              />
              <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
          </label>

          <label>
            {t('whereIsIt')}
            <input
              list="known-locations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
            />
            <datalist id="known-locations">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>

          <label>
            {t('notes')}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
            />
          </label>

          <div className="photo-row">
            {photoFile ? (
              <img className="thumb lg" src={URL.createObjectURL(photoFile)} alt="New photo" />
            ) : photoPath ? (
              <Thumb path={photoPath} alt="Photo" className="thumb lg" />
            ) : (
              <div className="thumb lg thumb-empty" />
            )}
            <div className="photo-actions">
              <label className="button">
                {photoPath || photoFile ? t('replacePhoto') : t('addPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setPhotoFile(f)
                  }}
                />
              </label>
              {(photoPath || photoFile) && (
                <button
                  type="button"
                  className="link danger"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPath(null)
                  }}
                >
                  {t('removePhoto')}
                </button>
              )}
            </div>
          </div>

          {!item && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              {flash ? t('savedFlash') : busy ? t('saving') : t('saveAndNext')}
            </button>
          )}

          {error && <p className="error">{error}</p>}

          {onDelete && (
            <button type="button" className="danger-button" onClick={onDeleteClick} disabled={busy}>
              {t('deleteEntry')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
