import { DEFAULT_ICE_SERVERS } from './config.js'
import type { Connection } from './types.js'

export type ConnectionState = {
  pc: RTCPeerConnection
  channel: RTCDataChannel | null
  connection?: Connection
  peerId: string
  onExpire?: (peerId: string) => void
}

export type PendingDataConnection = {
  resolve: (connection: Connection) => void
  reject: (error: Error) => void
}

export function cleanupConnection(
  connectionId: string,
  connections: Map<string, ConnectionState>,
  unregister: (id: string) => void
): void {
  const state = connections.get(connectionId)
  if (state) {
    state.pc.close()
  }
  connections.delete(connectionId)
  unregister(connectionId)
}

export function makePeerConnection(
  initiator: boolean,
  connectionId: string,
  connections: Map<string, ConnectionState>,
  unregister: (id: string) => void,
  rtcConfig?: RTCConfiguration
): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: DEFAULT_ICE_SERVERS,
    ...rtcConfig,
  })

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      cleanupConnection(connectionId, connections, unregister)
    }
  }

  pc.oniceconnectionstatechange = () => {
    if (
      pc.iceConnectionState === 'failed' ||
      pc.iceConnectionState === 'closed' ||
      pc.iceConnectionState === 'disconnected'
    ) {
      cleanupConnection(connectionId, connections, unregister)
    }
  }
  ;(pc as any)._initiator = initiator

  return pc
}
