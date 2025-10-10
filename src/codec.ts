import type { DataCodec } from './types.js'
import { encodeText, decodeText } from './utils.js'

// Tag byte flags
const IS_BINARY = 1
const IS_JSON = 2
const HAS_META = 4

const writeU32 = (arr: Uint8Array, offset: number, value: number) => {
  arr[offset] = value
  arr[offset + 1] = value >> 8
  arr[offset + 2] = value >> 16
  arr[offset + 3] = value >> 24
}

const readU32 = (arr: Uint8Array, offset: number) =>
  arr[offset]! |
  (arr[offset + 1]! << 8) |
  (arr[offset + 2]! << 16) |
  (arr[offset + 3]! << 24)

export const textCodec: DataCodec = {
  encode: (data, metadata) => {
    const isBinary = data instanceof ArrayBuffer || ArrayBuffer.isView(data)
    const isJson = !isBinary && typeof data !== 'string'
    const hasMeta = metadata !== undefined

    const tag =
      (isBinary ? IS_BINARY : 0) |
      (isJson ? IS_JSON : 0) |
      (hasMeta ? HAS_META : 0)

    // Encode metadata as JSON if present
    const metaBytes = hasMeta ? encodeText(JSON.stringify(metadata)) : null

    // Encode data based on type
    const dataBytes = isBinary
      ? data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(
            (data as Uint8Array).buffer,
            (data as Uint8Array).byteOffset,
            (data as Uint8Array).byteLength
          )
      : encodeText(isJson ? JSON.stringify(data) : (data as string))

    // Layout: [tag][metaLength?][metaBytes?][dataBytes]
    const totalSize =
      1 + (metaBytes ? 4 + metaBytes.byteLength : 0) + dataBytes.byteLength
    const result = new Uint8Array(totalSize)

    let offset = 0
    result[offset++] = tag

    if (metaBytes) {
      writeU32(result, offset, metaBytes.byteLength)
      offset += 4
      result.set(metaBytes, offset)
      offset += metaBytes.byteLength
    }

    result.set(dataBytes, offset)
    return result.buffer
  },

  decode: buffer => {
    const bytes = new Uint8Array(buffer as ArrayBuffer)
    const tag = bytes[0]!
    let offset = 1

    let metadata
    if (tag & HAS_META) {
      const metaLength = readU32(bytes, offset)
      offset += 4
      metadata = JSON.parse(
        decodeText(bytes.subarray(offset, offset + metaLength))
      )
      offset += metaLength
    }

    const payload = bytes.subarray(offset)
    const data =
      tag & IS_BINARY
        ? payload
        : tag & IS_JSON
          ? JSON.parse(decodeText(payload))
          : decodeText(payload)

    return { data, metadata }
  },
}
