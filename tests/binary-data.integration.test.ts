import { describe, it, expect } from 'vitest'
import { createDataPeer, type Connection } from '../src/index.js'

const TEST_PORT = 9000
const TEST_CONFIG = {
  host: 'localhost',
  port: TEST_PORT,
  path: '/peerjs',
  secure: false,
}

describe('Binary Data Integration Tests', () => {
  async function createPeer(id: string) {
    return await createDataPeer({ ...TEST_CONFIG, id })
  }

  describe('Binary Data Transfer', () => {
    it('sends and receives Uint8Array', async () => {
      const host = await createPeer('binary-host-1')
      const client = await createPeer('binary-client-1')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-host-1')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const sentData = new Uint8Array([1, 2, 3, 4, 5])
      await clientConnection.send(sentData)

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      expect(Array.from(receivedData as Uint8Array)).toEqual([1, 2, 3, 4, 5])

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends and receives ArrayBuffer', async () => {
      const host = await createPeer('binary-host-2')
      const client = await createPeer('binary-client-2')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-host-2')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const sentData = new Uint8Array([10, 20, 30, 40]).buffer
      await clientConnection.send(sentData)

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      expect(Array.from(receivedData as Uint8Array)).toEqual([10, 20, 30, 40])

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends and receives large binary data', async () => {
      const host = await createPeer('binary-host-large')
      const client = await createPeer('binary-client-large')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-host-large')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const size = 50000
      const sentData = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        sentData[i] = i % 256
      }

      await clientConnection.send(sentData)

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      expect((receivedData as Uint8Array).length).toBe(size)
      expect(Array.from(receivedData as Uint8Array)).toEqual(
        Array.from(sentData)
      )

      client.destroy()
      host.destroy()
    }, 15000)

    it('sends and receives Int16Array', async () => {
      const host = await createPeer('binary-host-int16')
      const client = await createPeer('binary-client-int16')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-host-int16')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const sentData = new Int16Array([-100, 0, 100, 200])
      await clientConnection.send(sentData)

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      const result = new Int16Array((receivedData as Uint8Array).slice().buffer)
      expect(Array.from(result)).toEqual(Array.from(sentData))

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends and receives Float32Array', async () => {
      const host = await createPeer('binary-host-float32')
      const client = await createPeer('binary-client-float32')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-host-float32')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      const sentData = new Float32Array([1.5, 2.7, -3.14, 0.0])
      await clientConnection.send(sentData)

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      const result = new Float32Array(
        (receivedData as Uint8Array).slice().buffer
      )
      expect(Array.from(result)).toEqual(Array.from(sentData))

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Binary Data with Metadata', () => {
    it('sends binary data with metadata', async () => {
      const host = await createPeer('binary-meta-host-1')
      const client = await createPeer('binary-meta-client-1')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-meta-host-1')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<{ data: unknown; metadata: unknown }>(
        resolve => {
          hostConnection.on('data', (data, metadata) =>
            resolve({ data, metadata })
          )
        }
      )

      const sentData = new Uint8Array([255, 128, 64, 32])
      const sentMetadata = { filename: 'data.bin', size: 4, type: 'binary' }
      await clientConnection.send(sentData, sentMetadata)

      const { data, metadata } = await dataPromise

      expect(data).toBeInstanceOf(Uint8Array)
      expect(Array.from(data as Uint8Array)).toEqual([255, 128, 64, 32])
      expect(metadata).toEqual(sentMetadata)

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends image-like binary data with rich metadata', async () => {
      const host = await createPeer('binary-image-host')
      const client = await createPeer('binary-image-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('binary-image-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<{ data: unknown; metadata: unknown }>(
        resolve => {
          hostConnection.on('data', (data, metadata) =>
            resolve({ data, metadata })
          )
        }
      )

      const imageSize = 1000
      const sentData = new Uint8Array(imageSize).fill(128)
      const sentMetadata = {
        filename: 'photo.jpg',
        type: 'image/jpeg',
        size: imageSize,
        width: 100,
        height: 100,
        timestamp: Date.now(),
      }
      await clientConnection.send(sentData, sentMetadata)

      const { data, metadata } = await dataPromise

      expect(data).toBeInstanceOf(Uint8Array)
      expect((data as Uint8Array).length).toBe(imageSize)
      expect(metadata).toEqual(sentMetadata)

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Mixed Data Types', () => {
    it('sends JSON, then binary, then string', async () => {
      const host = await createPeer('mixed-host-1')
      const client = await createPeer('mixed-client-1')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('mixed-host-1')
      const hostConnection = await hostConnectionPromise

      const receivedMessages: unknown[] = []
      hostConnection.on('data', (data: unknown) => {
        receivedMessages.push(data)
      })

      await clientConnection.send({ type: 'json', value: 123 })
      await clientConnection.send(new Uint8Array([1, 2, 3]))
      await clientConnection.send('Hello World')

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(receivedMessages.length).toBe(3)
      expect(receivedMessages[0]).toEqual({ type: 'json', value: 123 })
      expect(receivedMessages[1]).toBeInstanceOf(Uint8Array)
      expect(Array.from(receivedMessages[1] as Uint8Array)).toEqual([1, 2, 3])
      expect(receivedMessages[2]).toBe('Hello World')

      client.destroy()
      host.destroy()
    }, 10000)

    it('handles bidirectional binary transfer', async () => {
      const host = await createPeer('bidirectional-host')
      const client = await createPeer('bidirectional-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('bidirectional-host')
      const hostConnection = await hostConnectionPromise

      const clientReceived: unknown[] = []
      const hostReceived: unknown[] = []

      clientConnection.on('data', (data: unknown) => {
        clientReceived.push(data)
      })

      hostConnection.on('data', (data: unknown) => {
        hostReceived.push(data)
      })

      const clientData = new Uint8Array([10, 20, 30])
      const hostData = new Uint8Array([40, 50, 60])

      await clientConnection.send(clientData)
      await hostConnection.send(hostData)

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(hostReceived.length).toBe(1)
      expect(hostReceived[0]).toBeInstanceOf(Uint8Array)
      expect(Array.from(hostReceived[0] as Uint8Array)).toEqual([10, 20, 30])

      expect(clientReceived.length).toBe(1)
      expect(clientReceived[0]).toBeInstanceOf(Uint8Array)
      expect(Array.from(clientReceived[0] as Uint8Array)).toEqual([40, 50, 60])

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe('Edge Cases', () => {
    it('sends empty binary data', async () => {
      const host = await createPeer('empty-binary-host')
      const client = await createPeer('empty-binary-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('empty-binary-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<unknown>(resolve => {
        hostConnection.on('data', (data: unknown) => resolve(data))
      })

      await clientConnection.send(new Uint8Array([]))

      const receivedData = await dataPromise

      expect(receivedData).toBeInstanceOf(Uint8Array)
      expect((receivedData as Uint8Array).length).toBe(0)

      client.destroy()
      host.destroy()
    }, 10000)

    it('sends binary data with empty metadata', async () => {
      const host = await createPeer('empty-meta-host')
      const client = await createPeer('empty-meta-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('empty-meta-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<{ data: unknown; metadata: unknown }>(
        resolve => {
          hostConnection.on('data', (data, metadata) =>
            resolve({ data, metadata })
          )
        }
      )

      await clientConnection.send(new Uint8Array([1, 2, 3]), {})

      const { data, metadata } = await dataPromise

      expect(data).toBeInstanceOf(Uint8Array)
      expect(metadata).toEqual({})

      client.destroy()
      host.destroy()
    }, 10000)
  })
})
