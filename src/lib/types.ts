export type Item = {
  id: string
  category: string
  size: string
  quantity: number
  location: string | null
  notes: string | null
  photo_path: string | null
  created_at: string
  updated_at: string
}

export type ItemDraft = {
  category: string
  size: string
  quantity: number
  location: string | null
  notes: string | null
  photo_path: string | null
}
