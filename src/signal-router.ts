import type { AnswerMessage, CandidateMessage } from './types.js'

export type SignalHandler = {
  handleAnswer: (sdp: RTCSessionDescriptionInit) => void
  handleCandidate: (candidate: RTCIceCandidateInit) => void
  handleClose?: () => void
}

export type SignalRouter = {
  register: (connectionId: string, pc: RTCPeerConnection) => void
  unregister: (connectionId: string) => void
  route: (message: AnswerMessage | CandidateMessage) => void
  getPC: (connectionId: string) => RTCPeerConnection | undefined
}

export function createSignalRouter(): SignalRouter {
  const connections = new Map<string, RTCPeerConnection>()

  return {
    register: (connectionId: string, pc: RTCPeerConnection) => {
      connections.set(connectionId, pc)
    },

    unregister: (connectionId: string) => {
      connections.delete(connectionId)
    },

    route: (message: AnswerMessage | CandidateMessage) => {
      const { connectionId } = message.payload
      const pc = connections.get(connectionId)

      if (!pc) return

      if (message.type === 'ANSWER') {
        pc.setRemoteDescription(message.payload.sdp).catch(() => {})
      } else if (message.type === 'CANDIDATE') {
        pc.addIceCandidate(message.payload.candidate).catch(() => {})
      }
    },

    getPC: (connectionId: string) => {
      return connections.get(connectionId)
    },
  }
}
