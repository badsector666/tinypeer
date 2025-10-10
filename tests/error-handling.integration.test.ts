import { describe } from 'vitest'
import { createDataPeer, createPeer } from '../src/index.js'
import { runErrorHandlingTests } from './helpers/error-handling-tests.js'
import { createTestFactory } from './helpers/test-factory.js'

const TEST_PORT = 9000
const TEST_CONFIG = {
  host: 'localhost',
  port: TEST_PORT,
  path: '/peerjs',
  secure: false,
}

describe('Peer - Error Handling & Resilience Tests', () => {
  runErrorHandlingTests(createTestFactory({
    name: 'Peer',
    config: TEST_CONFIG,
    createFn: createPeer,
  }))
})

describe('DataPeer Only - Error Handling & Resilience Tests', () => {
  runErrorHandlingTests(createTestFactory({
    name: 'DataPeer',
    config: TEST_CONFIG,
    createFn: createDataPeer,
  }))
})
