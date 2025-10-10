import { describe, it, expect } from 'vitest'
import type { Connection } from '../../src/index.js'

type PeerFactory = {
  create: (id: string) => Promise<{
    id: string
    connect: (peerId: string, options?: any) => Promise<Connection>
    disconnect: () => void
    destroy: () => void
    on: (event: 'connection', handler: (conn: Connection) => void) => void
  }>
  createWithOptions?: (options?: any) => Promise<{
    id: string
    connect: (peerId: string, options?: any) => Promise<Connection>
    disconnect: () => void
    destroy: () => void
    on: (event: 'connection', handler: (conn: Connection) => void) => void
  }>
  name: string
}

export function runPeerCreationTests(factory: PeerFactory) {
  describe(`${factory.name} - Creation and Server Connection`, () => {
    it('creates a peer and connects to server', async () => {
      const peer = await factory.create('test-peer-1')

      expect(peer).toBeDefined()
      expect(peer.id).toBe('test-peer-1')
      expect(typeof peer.connect).toBe('function')
      expect(typeof peer.disconnect).toBe('function')
      expect(typeof peer.destroy).toBe('function')
      expect(typeof peer.on).toBe('function')

      peer.destroy()
    })

    if (factory.createWithOptions) {
      const createWithOpts = factory.createWithOptions

      it('auto-generates peer ID if not provided', async () => {
        const peer = await createWithOpts()

        expect(peer.id).toBeDefined()
        expect(peer.id.length).toBeGreaterThan(0)

        peer.destroy()
      })

      it('rejects connection with invalid peer ID', async () => {
        await expect(
          createWithOpts({ id: 'invalid peer id' })
        ).rejects.toThrow()
      })
    }
  })
}

export function runDataConnectionTests(factory: PeerFactory) {
  describe(`${factory.name} - Two-Peer Connection`, () => {
    it('establishes connection between two peers', async () => {
      const host = await factory.create('host-peer')
      const client = await factory.create('client-peer')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', conn => {
          resolve(conn)
        })
      })

      const clientConnection = await client.connect('host-peer', {
        metadata: { username: 'Alice' },
      })

      expect(clientConnection).toBeDefined()
      expect(clientConnection.peer).toBe('host-peer')
      expect(clientConnection.metadata).toEqual({ username: 'Alice' })

      const hostConnection = await hostConnectionPromise

      expect(hostConnection).toBeDefined()
      expect(hostConnection.peer).toBe('client-peer')
      expect(hostConnection.metadata).toEqual({ username: 'Alice' })

      client.destroy()
      host.destroy()
    }, 10000)

    it('handles connection with metadata', async () => {
      const host = await factory.create('host-metadata')
      const client = await factory.create('client-metadata')

      const connectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const metadata = { type: 'player', name: 'Bob', level: 5 }
      await client.connect('host-metadata', { metadata })

      const conn = await connectionPromise

      expect(conn.metadata).toEqual(metadata)

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe(`${factory.name} - Connection Lifecycle`, () => {
    it('handles connection close from client side', async () => {
      const host = await factory.create('host-close-test')
      const client = await factory.create('client-close-test')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('host-close-test')
      const hostConnection = await hostConnectionPromise

      const closePromise = new Promise<void>(resolve => {
        hostConnection.on('close', () => {
          resolve()
        })
      })

      clientConnection.close()

      await closePromise

      client.destroy()
      host.destroy()
    }, 10000)

    it('handles peer destroy', async () => {
      const peer = await factory.create('destroy-test')

      expect(peer.id).toBe('destroy-test')

      peer.destroy()

      await expect(peer.connect('some-peer')).rejects.toThrow()
    })

    it('handles peer disconnect', async () => {
      const peer = await factory.create('disconnect-test')

      expect(peer.id).toBe('disconnect-test')

      peer.disconnect()

      peer.destroy()
    })
  })

  describe(`${factory.name} - Multiple Connections`, () => {
    it('allows host to receive multiple client connections', async () => {
      const host = await factory.create('multi-host')
      const client1 = await factory.create('multi-client-1')
      const client2 = await factory.create('multi-client-2')

      const connections: Connection[] = []
      host.on('connection', conn => {
        connections.push(conn)
      })

      await client1.connect('multi-host', { metadata: { id: 1 } })
      await client2.connect('multi-host', { metadata: { id: 2 } })

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(connections.length).toBe(2)
      expect(connections[0]?.peer).toBe('multi-client-1')
      expect(connections[1]?.peer).toBe('multi-client-2')
      expect(connections[0]?.metadata).toEqual({ id: 1 })
      expect(connections[1]?.metadata).toEqual({ id: 2 })

      client1.destroy()
      client2.destroy()
      host.destroy()
    }, 15000)
  })

  describe(`${factory.name} - Error Handling`, () => {
    it('handles connection to non-existent peer gracefully', async () => {
      const peer = await factory.create('error-test-peer')

      await expect(
        peer.connect('non-existent-peer', { connectionTimeout: 5000 })
      ).rejects.toThrow()

      peer.destroy()
    }, 10000)
  })

  describe(`${factory.name} - Connection Events`, () => {
    it('fires data event when receiving messages', async () => {
      const host = await factory.create('data-event-host')
      const client = await factory.create('data-event-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('data-event-host')
      const hostConnection = await hostConnectionPromise

      const dataPromise = new Promise<any>(resolve => {
        hostConnection.on('data', data => resolve(data))
      })

      clientConnection.send('test message')

      const receivedData = await dataPromise
      expect(receivedData).toBe('test message')

      client.destroy()
      host.destroy()
    }, 10000)

    it('fires close event on connection close', async () => {
      const host = await factory.create('close-event-host')
      const client = await factory.create('close-event-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('close-event-host')
      const hostConnection = await hostConnectionPromise

      const closePromise = new Promise<void>(resolve => {
        hostConnection.on('close', () => resolve())
      })

      clientConnection.close()

      await closePromise

      client.destroy()
      host.destroy()
    }, 10000)
  })
}
