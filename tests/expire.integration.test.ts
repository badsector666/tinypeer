import { describe, it, expect } from 'vitest'
import { createPeer, createDataPeer } from '../src/index.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('EXPIRE Message Handling', () => {
  describe('Peer - Data Connection Expiration', () => {
    it('handles multiple connection attempts with mixed results', async () => {
      const peer1 = await createPeer()
      const peer2 = await createPeer()
      const peer3 = await createPeer()

      // Disconnect peer2 but leave peer3 alive
      peer2.disconnect()
      await sleep(100) // Allow server to register disconnection

      // Try to connect to both peers
      const connection2Promise = peer1.connect(peer2.id)
      const connection3Promise = peer1.connect(peer3.id)

      // peer2 connection should fail with EXPIRE
      await expect(connection2Promise).rejects.toThrow(
        `Could not connect to peer ${peer2.id}`
      )

      // peer3 connection should succeed
      const conn3 = await connection3Promise
      expect(conn3.peer).toBe(peer3.id)

      conn3.close()
      peer1.destroy()
      peer2.destroy()
      peer3.destroy()
    })
  })

  describe('DataPeer - Data Connection Expiration', () => {
    it('rejects connection with specific error when peer is unavailable', async () => {
      const peer1 = await createDataPeer()
      const peer2 = await createDataPeer()

      // Disconnect peer2 to make it unavailable
      peer2.disconnect()
      await sleep(100) // Allow server to register disconnection

      // Try to connect to unavailable peer
      const connectionPromise = peer1.connect(peer2.id)

      // Should fail with EXPIRE error
      await expect(connectionPromise).rejects.toThrow(
        `Could not connect to peer ${peer2.id}`
      )

      peer1.destroy()
      peer2.destroy()
    })
  })

  describe('Peer - Media Connection Expiration', () => {
    it('call returns MediaConnection but stream rejects for mixed connection types', async () => {
      const peer1 = await createPeer()
      const peer2 = await createPeer()
      const peer3 = await createPeer()

      const stream = new MediaStream()

      // Disconnect peer2
      peer2.disconnect()
      await sleep(100) // Allow server to register disconnection

      // Try both data and media connections to unavailable peer2
      const dataPromise = peer1.connect(peer2.id)

      // Media call returns MediaConnection immediately (synchronous)
      const call = peer1.call(peer2.id, stream)
      expect(call.peer).toBe(peer2.id)

      const connection3Promise = peer1.connect(peer3.id)

      // Data connection to peer2 should reject
      await expect(dataPromise).rejects.toThrow(
        `Could not connect to peer ${peer2.id}`
      )

      // Media call returned MediaConnection, but stream promise should reject
      await expect(call.stream).rejects.toThrow(
        `Could not connect to peer ${peer2.id}`
      )

      // peer3 connection should succeed
      const conn3 = await connection3Promise
      expect(conn3.peer).toBe(peer3.id)

      conn3.close()
      peer1.destroy()
      peer2.destroy()
      peer3.destroy()
    })
  })
})
