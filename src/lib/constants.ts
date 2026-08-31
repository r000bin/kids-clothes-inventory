// EU / Swiss kids clothing sizes, smallest first.
// The order of this array is what "bigger" and "smaller" mean everywhere in the app.
export const SIZES = [
  '50', '56', '62', '68', '74', '80', '86', '92', '98', '104',
  '110', '116', '122', '128', '134', '140', '146', '152', '158', '164',
] as const

// Edit this list to match how you actually sort your boxes.
export const CATEGORIES = [
  'Body / Onesie',
  'T-shirt',
  'Long-sleeve',
  'Sweater / Hoodie',
  'Shirt / Blouse',
  'Dress',
  'Skirt',
  'Trousers',
  'Jeans',
  'Leggings',
  'Shorts',
  'Pyjamas',
  'Underwear',
  'Socks',
  'Tights',
  'Jacket (light)',
  'Winter jacket',
  'Snow trousers',
  'Rain gear',
  'Hat / Cap',
  'Gloves',
  'Scarf',
  'Swimwear',
  'Sportswear',
  'Shoes',
  'Other',
] as const

/** Position of a size in SIZES; unknown/custom sizes sort to the end. */
export function sizeRank(size: string): number {
  const i = (SIZES as readonly string[]).indexOf(size)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

export function compareSizes(a: string, b: string): number {
  const d = sizeRank(a) - sizeRank(b)
  return d !== 0 ? d : a.localeCompare(b)
}
