import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LEGACY_CATEGORY_DE } from './constants'

export type Lang = 'de' | 'en'

// German is the default; the choice is per device, so each phone can differ.
const DEFAULT_LANG: Lang = 'de'
const STORAGE_KEY = 'lang'

const en = {
  appTitle: 'Clothes Inventory',
  loading: 'Loading…',
  signOut: 'Sign out',
  minSizeLabel: 'Smallest size still worn',
  notSet: '— not set —',
  pieces: '{n} pieces',
  readyToPassOn: '{n} ready to pass on',
  searchPlaceholder: 'Search category, box, note…',
  sizeChip: 'Size {s}',
  passOnChip: 'Ready to pass on',
  clearFilters: 'Clear all',
  addEntry: 'Add entry',
  tabBySize: 'By size',
  tabOverview: 'Overview',
  emptyList: 'Nothing here yet.',
  sizeHeading: 'Size {s}',
  passOnBadge: 'pass on',
  oneFewer: 'One fewer {c}',
  oneMore: 'One more {c}',
  authIntro: 'Sign in to see what is in the boxes.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  authNote: 'Accounts are created for you in the Supabase dashboard under Authentication → Users.',
  cancel: 'Cancel',
  editEntry: 'Edit entry',
  newEntry: 'New entry',
  save: 'Save',
  saving: 'Saving…',
  whatIsIt: 'What is it?',
  somethingElse: 'Something else…',
  nameIt: 'Name it',
  customPlaceholder: 'e.g. Ski gloves',
  size: 'Size',
  howMany: 'How many',
  whereIsIt: 'Where is it',
  locationPlaceholder: 'e.g. Basement box A',
  notes: 'Notes',
  notesPlaceholder: 'Brand, condition, who it came from…',
  addPhoto: 'Add photo',
  replacePhoto: 'Replace photo',
  removePhoto: 'Remove photo',
  deleteEntry: 'Delete entry',
  confirmDelete: 'Delete this entry?',
  needCategoryAndSize: 'Category and size are both needed.',
  saveAndNext: 'Save + next',
  savedFlash: 'Saved ✓',
  editCategories: 'Edit terms',
  categoriesTitle: 'Terms',
  done: 'Done',
  sortLabel: 'Order in the picker',
  sortCustom: 'Custom',
  sortAlpha: 'A–Z',
  sortFreq: 'Most used',
  addCategoryAction: 'Add',
  newCategoryPlaceholder: 'New term…',
  deleteCategoryConfirm: 'Remove “{c}” from the list? Existing entries keep their term.',
  duplicateCategory: 'This term already exists.',
  moveToTop: 'Move to top',
  dragHandle: 'Drag to reorder',
  dragHint: 'Drag ⠿ to reorder, or tap ⤒ to move a term to the top.',
}

type Messages = typeof en
export type MessageKey = keyof Messages

// Swiss orthography on purpose: "Grösse", never "Größe".
const de: Messages = {
  appTitle: 'Kleider-Inventar',
  loading: 'Laden…',
  signOut: 'Abmelden',
  minSizeLabel: 'Kleinste noch getragene Grösse',
  notSet: '— nicht gesetzt —',
  pieces: '{n} Teile',
  readyToPassOn: '{n} bereit zum Weitergeben',
  searchPlaceholder: 'Kategorie, Kiste, Notiz suchen…',
  sizeChip: 'Grösse {s}',
  passOnChip: 'Bereit zum Weitergeben',
  clearFilters: 'Filter löschen',
  addEntry: 'Eintrag hinzufügen',
  tabBySize: 'Nach Grösse',
  tabOverview: 'Übersicht',
  emptyList: 'Noch nichts da.',
  sizeHeading: 'Grösse {s}',
  passOnBadge: 'weitergeben',
  oneFewer: 'Eins weniger: {c}',
  oneMore: 'Eins mehr: {c}',
  authIntro: 'Melde dich an, um zu sehen, was in den Kisten ist.',
  email: 'E-Mail',
  password: 'Passwort',
  signIn: 'Anmelden',
  signingIn: 'Anmelden…',
  authNote: 'Konten werden im Supabase-Dashboard unter Authentication → Users erstellt.',
  cancel: 'Abbrechen',
  editEntry: 'Eintrag bearbeiten',
  newEntry: 'Neuer Eintrag',
  save: 'Speichern',
  saving: 'Speichern…',
  whatIsIt: 'Was ist es?',
  somethingElse: 'Etwas anderes…',
  nameIt: 'Bezeichnung',
  customPlaceholder: 'z. B. Skihandschuhe',
  size: 'Grösse',
  howMany: 'Wie viele',
  whereIsIt: 'Wo ist es',
  locationPlaceholder: 'z. B. Kellerkiste A',
  notes: 'Notizen',
  notesPlaceholder: 'Marke, Zustand, von wem…',
  addPhoto: 'Foto hinzufügen',
  replacePhoto: 'Foto ersetzen',
  removePhoto: 'Foto entfernen',
  deleteEntry: 'Eintrag löschen',
  confirmDelete: 'Diesen Eintrag löschen?',
  needCategoryAndSize: 'Kategorie und Grösse werden beide benötigt.',
  saveAndNext: 'Speichern + nächstes',
  savedFlash: 'Gespeichert ✓',
  editCategories: 'Begriffe bearbeiten',
  categoriesTitle: 'Begriffe',
  done: 'Fertig',
  sortLabel: 'Reihenfolge in der Auswahl',
  sortCustom: 'Eigene',
  sortAlpha: 'A–Z',
  sortFreq: 'Häufigste',
  addCategoryAction: 'Hinzufügen',
  newCategoryPlaceholder: 'Neuer Begriff…',
  deleteCategoryConfirm: '«{c}» aus der Liste entfernen? Bestehende Einträge behalten ihren Begriff.',
  duplicateCategory: 'Diesen Begriff gibt es schon.',
  moveToTop: 'An den Anfang',
  dragHandle: 'Ziehen zum Sortieren',
  dragHint: '⠿ ziehen zum Sortieren, oder ⤒ tippen, um einen Begriff nach ganz oben zu setzen.',
}

const MESSAGES: Record<Lang, Messages> = { de, en }

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
}

type I18n = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  categoryLabel: (category: string) => string
}

const I18nContext = createContext<I18n | null>(null)

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'de' || v === 'en') return v
  } catch {
    // storage unavailable (private mode etc.) — fall through
  }
  return DEFAULT_LANG
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(storedLang)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // fine, the choice just won't survive a reload
    }
    document.documentElement.lang = lang
    document.title = MESSAGES[lang].appTitle
  }, [lang])

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => format(MESSAGES[lang][key], vars),
      // Categories are stored as the user named them; the lookup only still
      // translates entries written by old versions that stored English names.
      categoryLabel: (category) =>
        lang === 'de' ? LEGACY_CATEGORY_DE[category] ?? category : category,
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LangProvider>')
  return ctx
}

export function LangSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label="Sprache / Language">
      {(['de', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={l === lang ? 'on' : ''}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
