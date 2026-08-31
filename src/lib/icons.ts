// Emoji stand-ins for entries without a photo. Matched by keyword so they
// keep working when terms are renamed, in German and English alike.
// Order matters: specific words come before generic ones ("Schneehose" and
// "Regenkleidung" must win over "Hose" and "Kleid").
const RULES: Array<[string[], string]> = [
  [['body', 'strampler', 'onesie'], '👶'],
  [['pyjama', 'schlafanzug', 'nachthemd'], '🌙'],
  [['schneehose', 'schnee', 'snow', 'ski'], '⛷️'],
  [['regen', 'rain'], '☔'],
  [['bade', 'schwimm', 'swim', 'bikini'], '🩱'],
  [['sport', 'turn', 'gym'], '🎽'],
  [['unterwäsche', 'unterhose', 'underwear', 'slip'], '🩲'],
  [['strumpfhose', 'tights', 'socke', 'sock'], '🧦'],
  [['t-shirt', 'tshirt'], '👕'],
  [['langarm', 'long-sleeve', 'longsleeve'], '👕'],
  [['pullover', 'pulli', 'hoodie', 'sweat'], '👚'],
  [['hemd', 'bluse', 'blouse', 'shirt'], '👔'],
  [['jacke', 'jacket', 'mantel', 'coat', 'weste', 'vest'], '🧥'],
  [['kleid', 'dress', 'jupe', 'rock', 'skirt'], '👗'],
  [['shorts'], '🩳'],
  [['jeans', 'hose', 'trousers', 'pants', 'leggings'], '👖'],
  [['mütze', 'kappe', 'cap', 'hut', 'hat', 'beanie'], '🧢'],
  [['handschuh', 'glove'], '🧤'],
  [['schal', 'scarf'], '🧣'],
  [['schuh', 'shoe', 'sneaker', 'stiefel', 'boot', 'finken', 'sandale'], '👟'],
]

const FALLBACK = '🧺'

export function categoryIcon(category: string): string {
  const c = category.toLowerCase()
  for (const [keywords, icon] of RULES) {
    if (keywords.some((k) => c.includes(k))) return icon
  }
  return FALLBACK
}
