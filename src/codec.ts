import type { DataCodec } from './types.js'
import { encodeText, decodeText } from './utils.js'

const IS_BINARY = 1
const IS_JSON = 2
const HAS_META = 4

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

function encodeData(data: unknown): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return encodeText(typeof data === 'string' ? data : JSON.stringify(data))
}

export const textCodec: DataCodec = {
  encode: (data, metadata) => {
    const isBinary = data instanceof ArrayBuffer || ArrayBuffer.isView(data)
    const hasMeta = metadata !== undefined
    const tag = (isBinary ? IS_BINARY : typeof data === 'string' ? 0 : IS_JSON) | (hasMeta ? HAS_META : 0)
    const metaBytes = hasMeta ? encodeText(JSON.stringify(metadata)) : null
    const dataBytes = encodeData(data)

    const size = 1 + (metaBytes ? 4 + metaBytes.byteLength : 0) + dataBytes.byteLength
    const buf = new Uint8Array(size)
    let off = 0
    buf[off++] = tag
    if (metaBytes) {
      dv(buf).setUint32(off, metaBytes.byteLength, true)
      off += 4
      buf.set(metaBytes, off)
      off += metaBytes.byteLength
    }
    buf.set(dataBytes, off)
    return buf.buffer
  },

  decode: buffer => {
    const b = new Uint8Array(buffer as ArrayBuffer)
    const tag = b[0]!
    let off = 1
    let metadata
    if (tag & HAS_META) {
      const len = dv(b).getUint32(off, true)
      off += 4
      metadata = JSON.parse(decodeText(b.subarray(off, off + len)))
      off += len
    }
    const payload = b.subarray(off)
    const data = tag & IS_BINARY
      ? payload
      : tag & IS_JSON
        ? JSON.parse(decodeText(payload))
        : decodeText(payload)
    return { data, metadata }
  },
}
