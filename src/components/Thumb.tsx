import { useEffect, useState } from 'react'
import { photoUrl } from '../lib/photos'

export function Thumb({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void photoUrl(path).then((u) => {
      if (!cancelled) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [path])

  if (!url) return <div className={className ? `${className} thumb-empty` : 'thumb-empty'} />
  return <img className={className} src={url} alt={alt} loading="lazy" />
}
