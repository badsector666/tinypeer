import { describe, it, expect } from 'vitest'
import { createDataPeer, type DataCodec, type Connection } from '../src/index.js'
import { createTestFactory } from './helpers/test-factory.js'

const TEST_PORT = 9000
const TEST_CONFIG = {
  host: 'localhost',
  port: TEST_PORT,
  path: '/peerjs',
  secure: false,
}

const simpleJSONCodec: DataCodec = {
  encode: (data, metadata) => {
    const payload = { data, metadata }
    const json = JSON.stringify(payload)
    return new TextEncoder().encode(json).buffer
  },
  decode: (buffer) => {
    const json = new TextDecoder().decode(buffer)
    const payload = JSON.parse(json)
    return { data: payload.data, metadata: payload.metadata }
  },
}

const prefixCodec: DataCodec = {
  encode: (data, metadata) => {
    const payload = { data, metadata }
    const json = JSON.stringify(payload)
    const jsonBytes = new TextEncoder().encode(json)
    const prefix = new TextEncoder().encode('PREFIX:')
    const result = new Uint8Array(prefix.length + jsonBytes.length)
    result.set(prefix, 0)
    result.set(jsonBytes, prefix.length)
    return result.buffer
  },
  decode: (buffer) => {
    const bytes = new Uint8Array(buffer as ArrayBuffer)
    const prefix = new TextDecoder().decode(bytes.subarray(0, 7))
    if (prefix !== 'PREFIX:') {
      throw new Error('Invalid prefix')
    }
    const json = new TextDecoder().decode(bytes.subarray(7))
    const payload = JSON.parse(json)
    return { data: payload.data, metadata: payload.metadata }
  },
}

describe('Custom Codec Integration Tests', () => {
  describe('Simple JSON Codec', () => {
    it('uses custom codec for peer-to-peer communication', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-host-1',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-client-1',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('custom-codec-host-1')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>((resolve) => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      await clientConnection.send({ message: 'Hello with custom codec!' })

      const receivedData = await dataPromise

      expect(receivedData).toEqual({ message: 'Hello with custom codec!' })

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends binary data nested in objects with custom codec', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-host-binary',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-client-binary',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('custom-codec-host-binary')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>((resolve) => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const binaryData = new Uint8Array([1, 2, 3, 4, 5])
      await clientConnection.send({
        message: 'Image data',
        image: Array.from(binaryData),
        timestamp: 12345,
      })

      const receivedData = await dataPromise as any

      expect(receivedData.message).toBe('Image data')
      expect(receivedData.image).toEqual([1, 2, 3, 4, 5])
      expect(receivedData.timestamp).toBe(12345)

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends custom codec data with metadata', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-meta-host',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'custom-codec-meta-client',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('custom-codec-meta-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<{ data: unknown; metadata: unknown }>((resolve) => {
        hostConnection.on('data', (data: unknown, metadata: unknown) => resolve({ data, metadata }))
      })

      await clientConnection.send({ value: 123 }, { sender: 'client', timestamp: Date.now() })

      const { data, metadata } = await dataPromise

      expect(data).toEqual({ value: 123 })
      expect(metadata).toHaveProperty('sender', 'client')
      expect(metadata).toHaveProperty('timestamp')

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Prefix Codec', () => {
    it('uses codec with custom prefix validation', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'prefix-codec-host',
        codec: prefixCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'prefix-codec-client',
        codec: prefixCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('prefix-codec-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>((resolve) => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      await clientConnection.send({ type: 'prefixed', value: 'test' })

      const receivedData = await dataPromise

      expect(receivedData).toEqual({ type: 'prefixed', value: 'test' })

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Codec Compatibility', () => {
    it('handles multiple connections with same codec', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'multi-codec-host',
        codec: simpleJSONCodec,
      })
      const client1 = await createDataPeer({
        ...TEST_CONFIG,
        id: 'multi-codec-client-1',
        codec: simpleJSONCodec,
      })
      const client2 = await createDataPeer({
        ...TEST_CONFIG,
        id: 'multi-codec-client-2',
        codec: simpleJSONCodec,
      })

      const connections: any[] = []
      host.on('connection', (conn) => {
        connections.push(conn)
      })

      await client1.connect('multi-codec-host')
      await client2.connect('multi-codec-host')

      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(connections.length).toBe(2)

      const messages1: unknown[] = []
      const messages2: unknown[] = []

      connections[0].on('data', (data: unknown) => messages1.push(data))
      connections[1].on('data', (data: unknown) => messages2.push(data))

      const conn1 = await client1.connect('multi-codec-host')
      const conn2 = await client2.connect('multi-codec-host')

      await conn1.send({ from: 'client1', value: 'A' })
      await conn2.send({ from: 'client2', value: 'B' })

      await new Promise((resolve) => setTimeout(resolve, 500))

      client1.destroy()
      client2.destroy()
      host.destroy()
    }, 15000)

    it('handles bidirectional communication with custom codec', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'bidirectional-codec-host',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'bidirectional-codec-client',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('bidirectional-codec-host')
      const hostConnection = await hostConnectionPromise

      const clientReceived: unknown[] = []
      const hostReceived: unknown[] = []

      clientConnection.on('data', (data: unknown) => clientReceived.push(data))
      hostConnection.on('data', (data: unknown) => hostReceived.push(data))

      await clientConnection.send({ from: 'client', message: 'Hello Host' })
      await hostConnection.send({ from: 'host', message: 'Hello Client' })

      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(hostReceived.length).toBe(1)
      expect(hostReceived[0]).toEqual({ from: 'client', message: 'Hello Host' })

      expect(clientReceived.length).toBe(1)
      expect(clientReceived[0]).toEqual({ from: 'host', message: 'Hello Client' })

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Codec Error Handling', () => {
    const factory = createTestFactory({
      name: 'CustomCodec',
      config: TEST_CONFIG,
      createFn: (opts) => createDataPeer({ ...opts, codec: simpleJSONCodec }),
    })

    it('creates peer with custom codec', async () => {
      const peer = await factory.create('codec-test-peer')

      expect(peer).toBeDefined()
      expect(peer.id).toBe('codec-test-peer')

      peer.destroy()
    })
  })

  describe('Complex Data with Custom Codec', () => {
    it('handles deeply nested objects', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'nested-codec-host',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'nested-codec-client',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('nested-codec-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>((resolve) => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const complexData = {
        user: {
          id: 'u1',
          profile: {
            name: 'Alice',
            settings: {
              theme: 'dark',
              notifications: {
                email: true,
                push: false,
              },
            },
          },
        },
        items: [
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
        ],
      }

      await clientConnection.send(complexData)

      const receivedData = await dataPromise

      expect(receivedData).toEqual(complexData)

      client.destroy()
      host.destroy()
    }, 10000)

    it('handles arrays of different types', async () => {
      const host = await createDataPeer({
        ...TEST_CONFIG,
        id: 'array-codec-host',
        codec: simpleJSONCodec,
      })
      const client = await createDataPeer({
        ...TEST_CONFIG,
        id: 'array-codec-client',
        codec: simpleJSONCodec,
      })

      const hostConnectionPromise = new Promise<Connection>((resolve) => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('array-codec-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>((resolve) => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const arrayData = {
        numbers: [1, 2, 3, 4, 5],
        strings: ['a', 'b', 'c'],
        mixed: [1, 'two', true, null, { key: 'value' }],
      }

      await clientConnection.send(arrayData)

      const receivedData = await dataPromise

      expect(receivedData).toEqual(arrayData)

      client.destroy()
      host.destroy()
    }, 10000)
  })
})
