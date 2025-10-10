import { createPeerCore } from './peer-core.js'
import type { PeerOptions, Connection } from './types.js'

export type DataPeer = {
  id: string
  connect: (
    peerId: string,
    options?: {
      metadata?: unknown
      reliable?: boolean
      connectionTimeout?: number
    }
  ) => Promise<Connection>
  disconnect: () => void
  destroy: () => void
  on: (event: 'connection', handler: (conn: Connection) => void) => void
}

export async function createDataPeer(options?: PeerOptions): Promise<DataPeer> {
  const core = await createPeerCore(options, {})

  return {
    id: core.id,
    connect: core.connect,
    disconnect: core.disconnect,
    destroy: core.destroy,
    on: core.on,
  }
}
