import { useState, type FormEvent } from 'react'
import { CATEGORIES, SIZES } from '../lib/constants'
import { deletePhoto, uploadPhoto } from '../lib/photos'
import type { Item, ItemDraft } from '../lib/types'
import { Thumb } from './Thumb'

const CUSTOM = '__custom__'

type Props = {
  item: Item | null
  locations: string[]
  defaultSize?: string
  onSave: (draft: ItemDraft) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

export function ItemForm({ item, locations, defaultSize, onSave, onDelete, onClose }: Props) {
  const knownCategory =
    !item || (CATEGORIES as readonly string[]).includes(item.category)
  const [category, setCategory] = useState(item ? (knownCategory ? item.category : CUSTOM) : CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState(knownCategory ? '' : item!.category)
  const [size, setSize] = useState(item?.size ?? defaultSize ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? 1)
  const [location, setLocation] = useState(item?.location ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedCategory = category === CUSTOM ? customCategory.trim() : category

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!resolvedCategory || !size) {
      setError('Category and size are both needed.')
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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  async function onDeleteClick() {
    if (!onDelete) return
    if (!confirm('Delete this entry?')) return
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
            Cancel
          </button>
          <strong>{item ? 'Edit entry' : 'New entry'}</strong>
          <button type="submit" className="link strong" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </header>

        <div className="sheet-body">
          <label>
            What is it?
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={CUSTOM}>Something else…</option>
            </select>
          </label>
          {category === CUSTOM && (
            <label>
              Name it
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Ski gloves"
                autoFocus
              />
            </label>
          )}

          <label>
            Size
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
            How many
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
            Where is it
            <input
              list="known-locations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Basement box A"
            />
            <datalist id="known-locations">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>

          <label>
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brand, condition, who it came from…"
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
                {photoPath || photoFile ? 'Replace photo' : 'Add photo'}
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
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {onDelete && (
            <button type="button" className="danger-button" onClick={onDeleteClick} disabled={busy}>
              Delete entry
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
