import { createPeerCore } from './peer-core.js'
import { createMediaCall, handleIncomingMediaOffer } from './media.js'
import type { Peer, PeerOptions, MediaConnection } from './types.js'

export async function createPeer(options?: PeerOptions): Promise<Peer> {
  const handlers: {
    connection?: (conn: any) => void
    call?: (call: MediaConnection) => void
  } = {}

  const core = await createPeerCore(options, {
    routeOffer: message => {
      if (message.payload.type !== 'media') return false

      handleIncomingMediaOffer(core, message, call => {
        handlers.call?.(call)
      })
      return true
    },
    routeAnswer: message => {
      if (message.payload.type !== 'media') return false
      core._getRouter().route(message)
      return true
    },
    routeCandidate: message => {
      if (message.payload.type !== 'media') return false
      core._getRouter().route(message)
      return true
    },
  })

  core.on('connection', conn => {
    handlers.connection?.(conn)
  })

  return {
    id: core.id,
    connect: core.connect,
    disconnect: core.disconnect,
    destroy: core.destroy,
    call: (peerId, stream, opts) =>
      createMediaCall(
        core,
        peerId,
        stream,
        opts?.metadata,
        opts?.connectionTimeout
      ),
    on: ((event: string, handler: any) => {
      if (event === 'call') {
        handlers.call = handler
      } else if (event === 'connection') {
        handlers.connection = handler
      }
    }) as Peer['on'],
  }
}
