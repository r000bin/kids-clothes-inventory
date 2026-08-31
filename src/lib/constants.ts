// EU / Swiss kids clothing sizes, smallest first, including the common
// dual sizes (122/128 etc.). The order of this array is what the size
// picker shows; "bigger" and "smaller" come from sizeRank below.
export const SIZES = [
  '50', '50/56', '56',
  '62', '62/68', '68',
  '74', '74/80', '80',
  '86', '86/92', '92',
  '98', '98/104', '104',
  '110', '110/116', '116',
  '122', '122/128', '128',
  '134', '134/140', '140',
  '146', '146/152', '152',
  '158', '158/164', '164',
] as const

// A dual size counts as its larger number: a 122/128 shirt still fits a kid
// wearing 128, so it only becomes "ready to pass on" once she is past 128.
export function sizeRank(size: string): number {
  const nums = size.match(/\d+/g)
  return nums ? Math.max(...nums.map(Number)) : Number.MAX_SAFE_INTEGER
}

function sizeMin(size: string): number {
  const nums = size.match(/\d+/g)
  return nums ? Math.min(...nums.map(Number)) : Number.MAX_SAFE_INTEGER
}

export function compareSizes(a: string, b: string): number {
  const d = sizeRank(a) - sizeRank(b)
  if (d !== 0) return d
  // Same upper bound: the dual size (lower minimum) sorts first, 122/128 < 128.
  const m = sizeMin(a) - sizeMin(b)
  return m !== 0 ? m : a.localeCompare(b)
}

// How the category picker is ordered: the hand-arranged list, alphabetical,
// or most-used first. Stored in the shared settings table.
export type CategorySort = 'custom' | 'alpha' | 'freq'

// The category list itself lives in the shared `settings` table so it can be
// renamed and reordered in the app. Everything below only exists to seed that
// list once and to recognise entries saved by app versions that stored the
// English names.
export const LEGACY_CATEGORY_DE: Record<string, string> = {
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

export const DEFAULT_CATEGORIES: string[] = Object.values(LEGACY_CATEGORY_DE)
