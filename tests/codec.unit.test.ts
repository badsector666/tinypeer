import { describe, it, expect } from 'bun:test'
import { textCodec } from '../src/codec.js'

describe('textCodec', () => {
  describe('encode/decode', () => {
    it('encodes and decodes JSON objects', () => {
      const data = { type: 'message', text: 'Hello World', count: 42 }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
      expect(decoded.metadata).toBeUndefined()
    })

    it('encodes and decodes strings', () => {
      const data = 'Hello World'
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBe(data)
      expect(decoded.metadata).toBeUndefined()
    })

    it('encodes and decodes empty strings', () => {
      const data = ''
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBe(data)
      expect(decoded.metadata).toBeUndefined()
    })

    it('encodes and decodes ArrayBuffer', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]).buffer
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(decoded.data as Uint8Array)).toEqual([1, 2, 3, 4, 5])
      expect(decoded.metadata).toBeUndefined()
    })

    it('encodes and decodes Uint8Array', () => {
      const data = new Uint8Array([10, 20, 30, 40])
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(decoded.data as Uint8Array)).toEqual([10, 20, 30, 40])
      expect(decoded.metadata).toBeUndefined()
    })

    it('encodes and decodes Uint16Array', () => {
      const data = new Uint16Array([1000, 2000, 3000])
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      const result = new Uint16Array(
        (decoded.data as Uint8Array).slice().buffer
      )
      expect(Array.from(result)).toEqual(Array.from(data))
    })

    it('encodes and decodes Int32Array', () => {
      const data = new Int32Array([-100, 0, 100, 200])
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      const result = new Int32Array((decoded.data as Uint8Array).slice().buffer)
      expect(Array.from(result)).toEqual(Array.from(data))
    })

    it('encodes and decodes Float32Array', () => {
      const data = new Float32Array([1.5, 2.7, -3.14])
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      const result = new Float32Array(
        (decoded.data as Uint8Array).slice().buffer
      )
      expect(Array.from(result)).toEqual(Array.from(data))
    })

    it('encodes and decodes empty binary data', () => {
      const data = new Uint8Array([])
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect((decoded.data as Uint8Array).length).toBe(0)
    })

    it('encodes and decodes large binary data', () => {
      const size = 100000
      const data = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        data[i] = i % 256
      }

      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect((decoded.data as Uint8Array).length).toBe(size)
      expect(Array.from(decoded.data as Uint8Array)).toEqual(Array.from(data))
    })
  })

  describe('metadata support', () => {
    it('encodes and decodes JSON with metadata', () => {
      const data = { message: 'Hello' }
      const metadata = { timestamp: 123456, userId: 'user1' }
      const encoded = textCodec.encode(data, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
      expect(decoded.metadata).toEqual(metadata)
    })

    it('encodes and decodes string with metadata', () => {
      const data = 'Hello World'
      const metadata = { encoding: 'utf-8', lang: 'en' }
      const encoded = textCodec.encode(data, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBe(data)
      expect(decoded.metadata).toEqual(metadata)
    })

    it('encodes and decodes binary with metadata', () => {
      const data = new Uint8Array([1, 2, 3, 4])
      const metadata = {
        filename: 'data.bin',
        type: 'application/octet-stream',
        size: 4,
      }
      const encoded = textCodec.encode(data, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(decoded.data as Uint8Array)).toEqual([1, 2, 3, 4])
      expect(decoded.metadata).toEqual(metadata)
    })

    it('encodes and decodes binary image with metadata', () => {
      const imageData = new Uint8Array(1000).fill(255)
      const metadata = {
        filename: 'photo.jpg',
        type: 'image/jpeg',
        size: imageData.byteLength,
        width: 100,
        height: 100,
      }
      const encoded = textCodec.encode(imageData, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect((decoded.data as Uint8Array).length).toBe(1000)
      expect(decoded.metadata).toEqual(metadata)
    })

    it('handles complex nested metadata', () => {
      const data = { action: 'update' }
      const metadata = {
        user: { id: 'u1', name: 'Alice' },
        session: { id: 's1', created: 12345 },
        tags: ['important', 'urgent'],
      }
      const encoded = textCodec.encode(data, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
      expect(decoded.metadata).toEqual(metadata)
    })

    it('handles null metadata', () => {
      const data = { message: 'test' }
      const encoded = textCodec.encode(data, null)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
      expect(decoded.metadata).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('handles special characters in strings', () => {
      const data = 'Hello 你好 🎉 \n\t\r'
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBe(data)
    })

    it('handles special characters in JSON', () => {
      const data = {
        text: 'Special: 你好 🎉',
        emoji: '🚀',
        newline: 'line1\nline2',
      }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
    })

    it('handles boolean values in JSON', () => {
      const data = { isActive: true, isDeleted: false }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
    })

    it('handles null values in JSON', () => {
      const data = { value: null, other: 'text' }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
    })

    it('handles arrays in JSON', () => {
      const data = { items: [1, 2, 3], tags: ['a', 'b', 'c'] }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
    })

    it('handles deeply nested JSON', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }
      const encoded = textCodec.encode(data)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toEqual(data)
    })

    it('handles large metadata', () => {
      const data = new Uint8Array([1, 2, 3])
      const metadata = {
        description: 'A'.repeat(10000),
        items: Array(100)
          .fill(0)
          .map((_, i) => ({ id: i, name: `Item ${i}` })),
      }
      const encoded = textCodec.encode(data, metadata)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect(decoded.metadata).toEqual(metadata)
    })
  })

  describe('TypedArray subarray handling', () => {
    it('encodes Uint8Array subarray correctly', () => {
      const buffer = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
      const subarray = buffer.subarray(2, 6)

      const encoded = textCodec.encode(subarray)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(decoded.data as Uint8Array)).toEqual([2, 3, 4, 5])
    })

    it('encodes Uint16Array subarray correctly', () => {
      const buffer = new Uint16Array([100, 200, 300, 400, 500])
      const subarray = buffer.subarray(1, 4)

      const encoded = textCodec.encode(subarray)
      const decoded = textCodec.decode(encoded)

      expect(decoded.data).toBeInstanceOf(Uint8Array)
      const result = new Uint16Array(
        (decoded.data as Uint8Array).slice().buffer
      )
      expect(Array.from(result)).toEqual([200, 300, 400])
    })
  })

  describe('round-trip compatibility', () => {
    it('maintains data integrity through multiple encode/decode cycles', () => {
      const original = { message: 'test', count: 42 }
      const metadata = { version: 1 }

      let encoded = textCodec.encode(original, metadata)
      for (let i = 0; i < 10; i++) {
        const decoded = textCodec.decode(encoded)
        expect(decoded.data).toEqual(original)
        expect(decoded.metadata).toEqual(metadata)
        encoded = textCodec.encode(decoded.data, decoded.metadata)
      }
    })

    it('maintains binary data integrity through multiple encode/decode cycles', () => {
      const original = new Uint8Array([255, 128, 64, 32, 16, 8, 4, 2, 1, 0])
      const metadata = { type: 'binary' }

      let encoded = textCodec.encode(original, metadata)
      for (let i = 0; i < 10; i++) {
        const decoded = textCodec.decode(encoded)
        expect(Array.from(decoded.data as Uint8Array)).toEqual(
          Array.from(original)
        )
        expect(decoded.metadata).toEqual(metadata)
        encoded = textCodec.encode(decoded.data, decoded.metadata)
      }
    })
  })
})
