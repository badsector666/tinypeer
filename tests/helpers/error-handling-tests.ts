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
  name: string
}

export function runErrorHandlingTests(factory: PeerFactory) {
  describe(`${factory.name} - Invalid Data Handling`, () => {
    it('handles connection send when channel is closed', async () => {
      const host = await factory.create('send-closed-host')
      const client = await factory.create('send-closed-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('send-closed-host', {
        connectionTimeout: 5000,
      })
      await hostConnectionPromise

      clientConnection.close()
      await new Promise(resolve => setTimeout(resolve, 100))

      await expect(clientConnection.send({ test: 'data' })).rejects.toThrow(
        'Connection is closed'
      )

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe(`${factory.name} - Cleanup and Disconnection Tests`, () => {
    it('cleans up multiple connections when peer is destroyed', async () => {
      const host = await factory.create('cleanup-host')
      const client1 = await factory.create('cleanup-client-1')
      const client2 = await factory.create('cleanup-client-2')

      const connections: Connection[] = []
      const closePromises: Promise<void>[] = []

      host.on('connection', conn => {
        connections.push(conn)
        closePromises.push(
          new Promise<void>(resolve => {
            conn.on('close', resolve)
          })
        )
      })

      await client1.connect('cleanup-host')
      await client2.connect('cleanup-host')

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(connections.length).toBe(2)

      host.destroy()

      await Promise.all(closePromises)

      await expect(host.connect('some-peer')).rejects.toThrow(
        'Peer has been destroyed'
      )

      client1.destroy()
      client2.destroy()
    }, 15000)

    it('handles peer disconnect with active connections', async () => {
      const host = await factory.create('disconnect-active-host')
      const client = await factory.create('disconnect-active-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('disconnect-active-host')
      const hostConnection = await hostConnectionPromise

      const clientClosePromise = new Promise<void>(resolve => {
        clientConnection.on('close', resolve)
      })

      const hostClosePromise = new Promise<void>(resolve => {
        hostConnection.on('close', resolve)
      })

      host.disconnect()

      await Promise.race([
        clientClosePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ])

      await Promise.race([
        hostClosePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ])

      client.destroy()
      host.destroy()
    }, 15000)

    it('handles remote peer leaving (LEAVE message)', async () => {
      const host = await factory.create('leave-host')
      const client = await factory.create('leave-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('leave-host')
      const hostConnection = await hostConnectionPromise

      const closePromises = [
        new Promise<void>(resolve => clientConnection.on('close', resolve)),
        new Promise<void>(resolve => hostConnection.on('close', resolve)),
      ]

      client.destroy()

      await Promise.race([
        Promise.all(closePromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Leave timeout')), 5000)
        ),
      ])

      host.destroy()
    }, 15000)

    it('cleans up connection handlers on close', async () => {
      const host = await factory.create('handler-cleanup-host')
      const client = await factory.create('handler-cleanup-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('handler-cleanup-host')
      const hostConnection = await hostConnectionPromise

      let dataHandlerCalled = false
      hostConnection.on('data', () => {
        dataHandlerCalled = true
      })

      clientConnection.close()

      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        await clientConnection.send({ test: 'data' })
      } catch {
        // Expected to fail
      }

      expect(dataHandlerCalled).toBe(false)

      client.destroy()
      host.destroy()
    }, 10000)
  })

  describe(`${factory.name} - Connection Edge Cases`, () => {
    it('handles connection to non-existent peer', async () => {
      const peer = await factory.create('timeout-test')

      await expect(
        peer.connect('non-existent-peer', { connectionTimeout: 3000 })
      ).rejects.toThrow()

      peer.destroy()
    }, 6000)

    it('handles multiple simultaneous connections from same peer', async () => {
      const host = await factory.create('simultaneous-host')
      const client = await factory.create('simultaneous-client')

      const connections: Connection[] = []
      host.on('connection', conn => {
        connections.push(conn)
      })

      const [conn1, conn2, conn3] = await Promise.all([
        client.connect('simultaneous-host', { metadata: { id: 1 } }),
        client.connect('simultaneous-host', { metadata: { id: 2 } }),
        client.connect('simultaneous-host', { metadata: { id: 3 } }),
      ])

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(conn1).toBeDefined()
      expect(conn2).toBeDefined()
      expect(conn3).toBeDefined()
      expect(connections.length).toBe(3)

      client.destroy()
      host.destroy()
    }, 15000)

    it('handles rapid connect and destroy cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const peer = await factory.create(`rapid-${i}`)

        expect(peer.id).toBe(`rapid-${i}`)

        peer.destroy()

        await expect(peer.connect('test')).rejects.toThrow(
          'Peer has been destroyed'
        )
      }
    }, 10000)
  })

  describe(`${factory.name} - Data Transfer Edge Cases`, () => {
    it('handles empty and null data', async () => {
      const host = await factory.create('empty-data-host')
      const client = await factory.create('empty-data-client')

      const hostConnectionPromise = new Promise<Connection>(resolve => {
        host.on('connection', resolve)
      })

      const clientConnection = await client.connect('empty-data-host')
      const hostConnection = await hostConnectionPromise

      const receivedData: any[] = []
      hostConnection.on('data', data => {
        receivedData.push(data)
      })

      await clientConnection.send(null)
      await clientConnection.send('')
      await clientConnection.send({})
      await clientConnection.send([])

      await new Promise(resolve => setTimeout(resolve, 500))

      expect(receivedData).toHaveLength(4)
      expect(receivedData[0]).toBeNull()
      expect(receivedData[1]).toBe('')
      expect(receivedData[2]).toEqual({})
      expect(receivedData[3]).toEqual([])

      client.destroy()
      host.destroy()
    }, 10000)
  })
}
