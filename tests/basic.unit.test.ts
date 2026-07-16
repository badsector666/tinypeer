import { describe, it, expect } from 'bun:test'
import { generateId, generateToken, isValidId } from '../src/utils.js'
import { createEmitter } from '../src/events.js'
import { createPeer, createDataPeer } from '../src/index.js'
import {
  generateMediaConnectionId,
  createConnection,
} from '../src/connection.js'

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('generates a UUID', () => {
      const id = generateId()
      expect(id).toHaveLength(36)
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    })

    it('generates unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateToken', () => {
    it('generates a token (first segment of UUID)', () => {
      const token = generateToken()
      expect(token).toHaveLength(8)
      expect(token).toMatch(/^[0-9a-f]{8}$/)
    })

    it('generates unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('isValidId', () => {
    it('accepts valid peer IDs', () => {
      expect(isValidId('valid-id')).toBe(true)
      expect(isValidId('Valid_ID123')).toBe(true)
      expect(isValidId('peer.123')).toBe(true)
      expect(isValidId('a-b_c.d-123')).toBe(true)
    })

    it('rejects invalid peer IDs', () => {
      expect(isValidId('invalid id')).toBe(false)
      expect(isValidId('invalid@id')).toBe(false)
      expect(isValidId('invalid#id')).toBe(false)
      expect(isValidId('')).toBe(false)
    })
  })
})

describe('Event System', () => {
  it('registers and emits events', () => {
    const emitter = createEmitter()
    let receivedData: any = null

    emitter.on('test', data => {
      receivedData = data
    })
    emitter.emit('test', 'data')

    expect(receivedData).toBe('data')
  })

  it('supports multiple handlers for same event', () => {
    const emitter = createEmitter()
    let received1: any = null
    let received2: any = null

    emitter.on('test', data => {
      received1 = data
    })
    emitter.on('test', data => {
      received2 = data
    })
    emitter.emit('test', 'data')

    expect(received1).toBe('data')
    expect(received2).toBe('data')
  })

  it('removes specific handler', () => {
    const emitter = createEmitter()
    let wasCalled = false
    const handler = () => {
      wasCalled = true
    }

    emitter.on('test', handler)
    emitter.off('test', handler)
    emitter.emit('test', 'data')

    expect(wasCalled).toBe(false)
  })

  it('removes all listeners', () => {
    const emitter = createEmitter()
    let called1 = false
    let called2 = false

    emitter.on('test1', () => {
      called1 = true
    })
    emitter.on('test2', () => {
      called2 = true
    })
    emitter.clearAll()
    emitter.emit('test1', 'data')
    emitter.emit('test2', 'data')

    expect(called1).toBe(false)
    expect(called2).toBe(false)
  })
})

describe('Peer Creation', () => {
  it('exports createPeer function', () => {
    expect(createPeer).toBeDefined()
    expect(typeof createPeer).toBe('function')
  })

  it('rejects invalid peer IDs', async () => {
    await expect(createPeer({ id: 'invalid id' })).rejects.toThrow()
  })

  it('returns a promise for valid peer IDs', () => {
    const result = createPeer({ id: 'valid-peer-id' })
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('Data Peer Creation', () => {
  it('exports createDataPeer function', () => {
    expect(createDataPeer).toBeDefined()
    expect(typeof createDataPeer).toBe('function')
  })

  it('rejects invalid peer IDs', async () => {
    await expect(createDataPeer({ id: 'invalid id' })).rejects.toThrow()
  })

  it('returns a promise for valid peer IDs', () => {
    const result = createDataPeer({ id: 'valid-peer-id' })
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('Media Connection Unit Tests', () => {
  describe('generateMediaConnectionId', () => {
    it('generates connection ID with mc_ prefix', () => {
      const id = generateMediaConnectionId()
      expect(id).toMatch(/^mc_/)
      expect(id.length).toBeGreaterThan(3)
    })

    it('generates unique IDs', () => {
      const id1 = generateMediaConnectionId()
      const id2 = generateMediaConnectionId()
      expect(id1).not.toBe(id2)
    })
  })
})

describe('Connection Close Behavior', () => {
  it('close() triggers close handler synchronously', () => {
    // Create a mock RTCDataChannel
    const mockChannel = {
      readyState: 'open',
      binaryType: '',
      close: () => {},
      send: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as RTCDataChannel

    const { connection } = createConnection('test-peer', mockChannel)

    let closeHandlerCalled = false
    connection.on('close', () => {
      closeHandlerCalled = true
    })

    // Call close and verify handler was called synchronously
    connection.close()
    expect(closeHandlerCalled).toBe(true)
  })
})
