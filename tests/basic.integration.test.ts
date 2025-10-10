import { describe } from 'vitest'
import { createDataPeer, createPeer } from '../src/index.js'
import {
  runPeerCreationTests,
  runDataConnectionTests,
} from './helpers/data-connection-tests.js'
import { createTestFactory } from './helpers/test-factory.js'

const TEST_PORT = 9000
const TEST_CONFIG = {
  host: 'localhost',
  port: TEST_PORT,
  path: '/peerjs',
  secure: false,
}

describe('Peer Integration Tests', () => {
  const factory = createTestFactory({
    name: 'Peer',
    config: TEST_CONFIG,
    createFn: createPeer,
  })

  runPeerCreationTests(factory)
  runDataConnectionTests(factory)
})

describe('DataPeer Only Integration Tests', () => {
  const factory = createTestFactory({
    name: 'DataPeer',
    config: TEST_CONFIG,
    createFn: createDataPeer,
  })

  runPeerCreationTests(factory)
  runDataConnectionTests(factory)
})
