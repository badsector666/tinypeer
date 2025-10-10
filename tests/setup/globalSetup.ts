import { startPeerServer, stopPeerServer } from './peerServer.js'

export async function setup() {
  await startPeerServer(9000)
}

export async function teardown() {
  await stopPeerServer()
}
