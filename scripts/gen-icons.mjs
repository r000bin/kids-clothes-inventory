// Generates the PNG home-screen icons from a tiny hand-drawn t-shirt shape.
// Pure Node - no image libraries - so `npm run icons` works on a fresh clone.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const BG = [0x1f, 0x7a, 0x5a]
const FG = [0xff, 0xff, 0xff]
const SAMPLES = 3 // supersampling per axis, for smooth edges

/** Rounded-square mask, in 0..1 coordinates. */
function inTile(x, y, r = 0.22) {
  const dx = Math.max(r - x, x - (1 - r), 0)
  const dy = Math.max(r - y, y - (1 - r), 0)
  return dx * dx + dy * dy <= r * r
}

/** T-shirt silhouette, in 0..1 coordinates. */
function inShirt(x, y) {
  const torso = Math.abs(x - 0.5) <= 0.19 && y >= 0.36 && y <= 0.8
  const sleeves = Math.abs(x - 0.5) <= 0.34 && y >= 0.32 && y <= 0.5
  const neck = (x - 0.5) ** 2 + (y - 0.34) ** 2 <= 0.115 ** 2
  return (torso || sleeves) && !neck
}

function coverage(px, py, size, test) {
  let hits = 0
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      const x = (px + (sx + 0.5) / SAMPLES) / size
      const y = (py + (sy + 0.5) / SAMPLES) / size
      if (test(x, y)) hits++
    }
  }
  return hits / (SAMPLES * SAMPLES)
}

function render(size) {
  // One filter byte (0 = none) plus RGBA per pixel, per scanline.
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    let o = y * (1 + size * 4) + 1
    for (let x = 0; x < size; x++) {
      const tile = coverage(x, y, size, inTile)
      const shirt = coverage(x, y, size, inShirt)
      for (let c = 0; c < 3; c++) {
        raw[o++] = Math.round(BG[c] * (1 - shirt) + FG[c] * shirt)
      }
      raw[o++] = Math.round(255 * tile)
    }
  }
  return raw
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [180, 192, 512]) {
  const file = join(OUT, `icon-${size}.png`)
  writeFileSync(file, png(size))
  console.log(`wrote ${file}`)
}
