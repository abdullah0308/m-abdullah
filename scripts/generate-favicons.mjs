/**
 * Generates favicon.ico + apple-touch-icon.png from public/favicon.svg.
 *
 * To change the site favicon: replace public/favicon.svg with your new logo,
 * then run:  npm run favicons
 */
import sharp from 'sharp'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

const root = process.cwd()
const SOURCE = resolve(root, 'public/favicon.svg')

async function renderPng(svg, size) {
  return sharp(svg, { density: 300 }).resize(size, size).png().toBuffer()
}

/** Build an .ico container from PNG buffers (PNG-in-ICO, supported everywhere modern). */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + 16 * entries.length
  entries.forEach(({ size, png }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)     // width
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1) // height
    dir.writeUInt8(0, o + 2)                      // palette
    dir.writeUInt8(0, o + 3)                      // reserved
    dir.writeUInt16LE(1, o + 4)                   // color planes
    dir.writeUInt16LE(32, o + 6)                  // bits per pixel
    dir.writeUInt32LE(png.length, o + 8)          // data size
    dir.writeUInt32LE(offset, o + 12)             // data offset
    offset += png.length
  })

  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

const svg = await readFile(SOURCE)

const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map((s) => renderPng(svg, s)))
const ico = buildIco(sizes.map((size, i) => ({ size, png: pngs[i] })))
await writeFile(resolve(root, 'public/favicon.ico'), ico)
console.log('[favicons] public/favicon.ico (16, 32, 48)')

await writeFile(resolve(root, 'public/apple-touch-icon.png'), await renderPng(svg, 180))
console.log('[favicons] public/apple-touch-icon.png (180)')

console.log('[favicons] Done — favicon.svg is served directly for modern browsers.')
