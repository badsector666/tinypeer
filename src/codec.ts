import type { DataCodec } from './types.js'
import { encodeText, decodeText } from './utils.js'

const B = 1, J = 2, M = 4
const dv = (a: Uint8Array) => new DataView(a.buffer, a.byteOffset, a.byteLength)

function toBytes(d: unknown): Uint8Array {
  if (d instanceof ArrayBuffer) return new Uint8Array(d)
  if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
  return encodeText(typeof d === 'string' ? d : JSON.stringify(d))
}

export const textCodec: DataCodec = {
  encode: (data, meta) => {
    const isBin = data instanceof ArrayBuffer || ArrayBuffer.isView(data)
    const hasMeta = meta !== undefined
    const tag = (isBin ? B : typeof data === 'string' ? 0 : J) | (hasMeta ? M : 0)
    const mB = hasMeta ? encodeText(JSON.stringify(meta)) : null
    const dB = toBytes(data)
    const size = 1 + (mB ? 4 + mB.length : 0) + dB.length
    const buf = new Uint8Array(size)
    buf[0] = tag
    let off = 1
    if (mB) {
      dv(buf).setUint32(off, mB.length, true)
      off += 4
      buf.set(mB, off)
      off += mB.length
    }
    buf.set(dB, off)
    return buf.buffer
  },

  decode: buffer => {
    const b = new Uint8Array(buffer as ArrayBuffer)
    const tag = b[0]!
    let off = 1, meta
    if (tag & M) {
      const len = dv(b).getUint32(off, true)
      off += 4
      meta = JSON.parse(decodeText(b.subarray(off, off += len)))
    }
    const payload = b.subarray(off)
    const data = tag & B ? payload : tag & J ? JSON.parse(decodeText(payload)) : decodeText(payload)
    return { data, metadata: meta }
  },
}
