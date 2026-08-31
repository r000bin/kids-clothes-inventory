import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

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
}

const MESSAGES: Record<Lang, Messages> = { de, en }

// Items keep their canonical (English) category in the database; only the
// display is translated. Ad-hoc categories typed via "Something else…" show
// as typed in both languages.
const CATEGORY_DE: Record<string, string> = {
  'Body / Onesie': 'Body / Strampler',
  'T-shirt': 'T-Shirt',
  'Long-sleeve': 'Langarmshirt',
  'Sweater / Hoodie': 'Pullover / Hoodie',
  'Shirt / Blouse': 'Hemd / Bluse',
  Dress: 'Kleid',
  Skirt: 'Jupe / Rock',
  Trousers: 'Hosen',
  Jeans: 'Jeans',
  Leggings: 'Leggings',
  Shorts: 'Shorts',
  Pyjamas: 'Pyjama',
  Underwear: 'Unterwäsche',
  Socks: 'Socken',
  Tights: 'Strumpfhosen',
  'Jacket (light)': 'Jacke (leicht)',
  'Winter jacket': 'Winterjacke',
  'Snow trousers': 'Schneehose',
  'Rain gear': 'Regenkleidung',
  'Hat / Cap': 'Mütze / Kappe',
  Gloves: 'Handschuhe',
  Scarf: 'Schal',
  Swimwear: 'Badesachen',
  Sportswear: 'Sportkleidung',
  Shoes: 'Schuhe',
  Other: 'Anderes',
}

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
      categoryLabel: (category) =>
        lang === 'de' ? CATEGORY_DE[category] ?? category : category,
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
