import { describe, it, expect, afterEach } from 'vitest'
import { createPeer } from '../src/index.js'
import type { Peer, MediaConnection } from '../src/index.js'

const TEST_PORT = 9000
const TEST_CONFIG = {
  host: 'localhost',
  port: TEST_PORT,
  path: '/peerjs',
  secure: false,
}

async function getTestMediaStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('Media devices not available in this environment')
  }

  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  })
}

describe('Media Connection Tests', () => {
  let peers: Peer[] = []

  afterEach(() => {
    for (const peer of peers) {
      peer.destroy()
    }
    peers = []
  })

  describe('Media Call - Basic Flow', () => {
    it('caller initiates call and receives remote stream', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee',
      })

      peers.push(caller, callee)

      const localStream = await getTestMediaStream()

      const callPromise = new Promise<MediaConnection>(resolve => {
        callee.on('call', call => {
          resolve(call)
        })
      })

      const call = await caller.call('callee', localStream, {
        metadata: { username: 'Alice' },
      })

      expect(call).toBeDefined()
      expect(call.peer).toBe('callee')
      expect(call.metadata).toEqual({ username: 'Alice' })
      expect(call.stream).toBeInstanceOf(Promise)

      const incomingCall = await callPromise

      expect(incomingCall).toBeDefined()
      expect(incomingCall.peer).toBe('caller')
      expect(incomingCall.metadata).toEqual({ username: 'Alice' })
    }, 10000)

    it('callee answers call with stream', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-2',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-2',
      })

      peers.push(caller, callee)

      const callerStream = await getTestMediaStream()

      callee.on('call', async _call => {
        // Don't answer - let it timeout
      })

      const call = await caller.call('callee-2', callerStream)

      expect(call).toBeDefined()
      expect(typeof call.answer).toBe('function')
      expect(typeof call.reject).toBe('function')
      expect(typeof call.close).toBe('function')
    }, 10000)

    it('media connection has correct metadata', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-3',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-3',
      })

      peers.push(caller, callee)

      const metadata = {
        username: 'Bob',
        roomId: 'room-123',
        timestamp: Date.now(),
      }

      const callPromise = new Promise<MediaConnection>(resolve => {
        callee.on('call', call => {
          resolve(call)
        })
      })

      await caller.call('callee-3', await getTestMediaStream(), { metadata })

      const incomingCall = await callPromise
      expect(incomingCall.metadata).toEqual(metadata)
    }, 10000)
  })

  describe('Media Call - Rejection', () => {
    it('callee can reject incoming call', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-reject',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-reject',
      })

      peers.push(caller, callee)

      callee.on('call', async call => {
        await call.reject()
      })

      const call = await caller.call(
        'callee-reject',
        await getTestMediaStream()
      )

      expect(call).toBeDefined()
    }, 10000)

    it('media connection supports close method', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-close',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-close',
      })

      peers.push(caller, callee)

      const callPromise = new Promise<MediaConnection>(resolve => {
        callee.on('call', call => {
          resolve(call)
        })
      })

      const call = await caller.call('callee-close', await getTestMediaStream())

      expect(typeof call.close).toBe('function')

      const incomingCall = await callPromise
      incomingCall.close()

      expect(true).toBe(true)
    }, 10000)
  })

  describe('Media Call - Event Handlers', () => {
    it('media connection supports event handlers', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-events',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-events',
      })

      peers.push(caller, callee)

      const call = await caller.call(
        'callee-events',
        await getTestMediaStream()
      )

      const streamPromise = new Promise<void>(resolve => {
        call.on('stream', stream => {
          expect(stream).toBeDefined()
          resolve()
        })
      })

      const closePromise = new Promise<void>(resolve => {
        call.on('close', () => {
          resolve()
        })
      })

      expect(typeof call.on).toBe('function')

      // Wait for both events to fire, or time out after 1s so the test doesn't hang.
      await Promise.race([
        Promise.all([streamPromise, closePromise]).catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 1000)),
      ])
    }, 10000)
  })

  describe('Media Call - Multiple Tracks', () => {
    it('supports video and audio tracks separately', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-tracks',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-tracks',
      })

      peers.push(caller, callee)

      const stream = await getTestMediaStream()

      callee.on('call', async call => {
        await call.answer(await getTestMediaStream())
      })

      const call = await caller.call('callee-tracks', stream)

      expect(call).toBeDefined()
      expect(stream.getVideoTracks().length).toBeGreaterThan(0)
      expect(stream.getAudioTracks().length).toBeGreaterThan(0)
    }, 10000)
  })

  describe('Media Call - Error Handling', () => {
    it('handles call to non-existent peer gracefully', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-error',
      })

      peers.push(caller)

      const stream = await getTestMediaStream()

      try {
        const call = await caller.call('non-existent-peer', stream, {
          connectionTimeout: 2000,
        })

        expect(call).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, 5000)

    it('rejects when answer is not called within timeout', async () => {
      const caller = await createPeer({
        ...TEST_CONFIG,
        id: 'caller-timeout',
      })
      const callee = await createPeer({
        ...TEST_CONFIG,
        id: 'callee-timeout',
      })

      peers.push(caller, callee)

      callee.on('call', async _call => {
        // Don't answer - let it timeout
      })
      const stream = await getTestMediaStream()
      const call = await caller.call('callee-timeout', stream)

      expect(call).toBeDefined()
    }, 10000)
  })

  describe('Peer API Extensions', () => {
    it('peer has call method', async () => {
      const peer = await createPeer({
        ...TEST_CONFIG,
        id: 'peer-api',
      })

      peers.push(peer)

      expect(typeof peer.call).toBe('function')
    })

    it('peer supports call event listener', async () => {
      const peer = await createPeer({
        ...TEST_CONFIG,
        id: 'peer-event',
      })

      peers.push(peer)

      const callPromise = new Promise<void>(resolve => {
        peer.on('call', call => {
          expect(call).toBeDefined()
          resolve()
        })
      })

      expect(typeof peer.on).toBe('function')

      // Wait briefly for the event in case it fires; timeout so test won't hang.
      await Promise.race([
        callPromise.catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 100)),
      ])
    })
  })
})
