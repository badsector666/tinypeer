import { describe, it, expect } from 'vitest'
import { createPeer, createDataPeer } from '../src/index.js'

describe('EXPIRE Message Handling', () => {
  describe('Peer - Data Connection Expiration', () => {
    it('handles multiple connection attempts with mixed results', async () => {
      const peer1 = await createPeer()
      const peer2 = await createPeer()
      const peer3 = await createPeer()

      // Disconnect peer2 but leave peer3 alive
      peer2.disconnect()

      // Try to connect to both peers
      const connection2Promise = peer1.connect(peer2.id)
      const connection3Promise = peer1.connect(peer3.id)

      // peer2 connection should fail
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
    it('rejects connection when peer is unreachable', async () => {
      const peer1 = await createDataPeer()
      const peer2 = await createDataPeer()

      // Disconnect peer2 from server (but ID remains registered briefly)
      peer2.disconnect()

      await expect(peer1.connect(peer2.id)).rejects.toThrow(
        `Could not connect to peer ${peer2.id}`
      )

      peer1.destroy()
      peer2.destroy()
    })
  })
})
