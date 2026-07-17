import { createEmitter } from './events.js'
import { createSocket, type Socket } from './socket.js'
import { createConnection, generateConnectionId } from './connection.js'
import { generateId, generateToken, isValidId } from './utils.js'
import { createSignalRouter, type SignalRouter } from './signal-router.js'
import {
  DEFAULT_CONFIG,
  DEFAULT_ICE_SERVERS,
  type PeerOptions,
  type Connection,
  type ConnectOptions,
  type InternalConfig,
  type OfferMessage,
  type AnswerMessage,
  type CandidateMessage,
} from './types.js'

type MessageRouter = {
  routeOffer?: (message: OfferMessage) => boolean
  routeAnswer?: (message: AnswerMessage) => boolean
  routeCandidate?: (message: CandidateMessage) => boolean
}

type ConnectionState = {
  pc: RTCPeerConnection
  channel: RTCDataChannel | null
  connection?: Connection
  peerId: string
  onExpire?: (peerId: string) => void
}

type PendingDataConnection = {
  resolve: (connection: Connection) => void
  reject: (error: Error) => void
}

export type PeerCoreInternal = {
  id: string
  connect: (peerId: string, options?: ConnectOptions) => Promise<Connection>
  disconnect: () => void
  destroy: () => void
  on: (event: 'connection', handler: (conn: Connection) => void) => void
  _createMediaPC: (
    peerId: string,
    connectionId: string,
    initiator: boolean,
    onExpire?: (peerId: string) => void
  ) => RTCPeerConnection
  _sendSignal: (
    dst: string,
    type: 'OFFER' | 'ANSWER' | 'CANDIDATE',
    payload: any
  ) => void
  _getSocket: () => Socket
  _getRouter: () => SignalRouter
}

export async function createPeerCore(
  options?: PeerOptions,
  router: MessageRouter = {}
): Promise<PeerCoreInternal> {
  const config: InternalConfig = {
    ...DEFAULT_CONFIG,
    ...options,
    id: options?.id || generateId(),
    token: options?.token || generateToken(),
  }

  if (!isValidId(config.id)) {
    throw new Error(`Invalid peer ID: ${config.id}`)
  }

  const socket = createSocket(config)
  const connections = new Map<string, ConnectionState>()
  const pendingConnections = new Map<string, PendingDataConnection>()
  const signalRouter = createSignalRouter()
  const emitter = createEmitter()
  let peerId = config.id
  let destroyed = false
  const codec = options?.codec

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'))
    }, 30000)

    socket.on('open', (assignedId: string) => {
      clearTimeout(timeout)
      peerId = assignedId
      config.id = assignedId
      resolve()
    })

    socket.on('serverError', error => {
      clearTimeout(timeout)
      reject(new Error(error.payload.msg))
    })

    socket.on('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
  })

  socket.on('offer', (message: OfferMessage) => {
    if (router.routeOffer?.(message)) return
    handleDataOffer(message)
  })

  socket.on('answer', (message: AnswerMessage) => {
    if (router.routeAnswer?.(message)) return
    signalRouter.route(message)
  })

  socket.on('candidate', (message: CandidateMessage) => {
    if (router.routeCandidate?.(message)) return
    signalRouter.route(message)
  })

  socket.on('leave', (_leavePeerId: string) => {
    for (const state of connections.values()) {
      state.pc.close()
    }
    connections.clear()
  })

  socket.on('expire', (expiredPeerId: string) => {
    for (const [connectionId, state] of connections.entries()) {
      if (state.peerId === expiredPeerId) {
        const initiator = (state.pc as any)._initiator
        if (initiator) {
          const pending = pendingConnections.get(connectionId)
          if (pending) {
            pending.reject(
              new Error(`Could not connect to peer ${expiredPeerId}`)
            )
            pendingConnections.delete(connectionId)
          }
          // Call media-specific expire handler if present
          if (state.onExpire) {
            state.onExpire(expiredPeerId)
          }
          cleanupConnection(connectionId)
        }
      }
    }
  })

  socket.on('close', () => {
    if (!destroyed) {
      for (const state of connections.values()) {
        state.pc.close()
      }
    }
  })

  function cleanupConnection(connectionId: string): void {
    const state = connections.get(connectionId)
    if (state) {
      state.pc.close()
    }
    connections.delete(connectionId)
    signalRouter.unregister(connectionId)
  }

  function makePeerConnection(
    initiator: boolean,
    connectionId: string
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      ...config.rtcConfig,
    })

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupConnection(connectionId)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed' ||
        pc.iceConnectionState === 'disconnected'
      ) {
        cleanupConnection(connectionId)
      }
    }
    ;(pc as any)._initiator = initiator

    return pc
  }

  async function setRemoteDescription(
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit,
    autoAnswer = true
  ): Promise<void> {
    const polite = !(pc as any)._initiator as boolean
    const collision = pc.signalingState !== 'stable'

    if (desc.type === 'offer') {
      if (!polite && collision) return

      await pc.setRemoteDescription(desc)

      if (autoAnswer && pc.signalingState === 'have-remote-offer') {
        await pc.setLocalDescription()
      }
    } else {
      await pc.setRemoteDescription(desc)
    }
  }

  async function connect(
    peerId: string,
    options?: ConnectOptions
  ): Promise<Connection> {
    if (destroyed) {
      throw new Error('Peer has been destroyed')
    }

    const connectionId = generateConnectionId()
    const pc = makePeerConnection(true, connectionId)
    signalRouter.register(connectionId, pc)

    return new Promise<Connection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingConnections.delete(connectionId)
        cleanupConnection(connectionId)
        reject(new Error('Connection timeout'))
      }, options?.connectionTimeout ?? 30000)

      pendingConnections.set(connectionId, { resolve, reject })

      const channel = pc.createDataChannel(connectionId, {
        ordered: true,
        maxRetransmits: options?.reliable !== false ? undefined : 0,
      })

      channel.binaryType = 'arraybuffer'

      const state: ConnectionState = {
        pc,
        channel,
        peerId,
      }

      connections.set(connectionId, state)

      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription()

          if (pc.localDescription) {
            socket.send({
              type: 'OFFER',
              dst: peerId,
              payload: {
                connectionId,
                type: 'data',
                metadata: options?.metadata,
                sdp: pc.localDescription,
                label: connectionId,
                serialization: 'json',
                reliable: options?.reliable !== false,
              },
            })
          }
        } catch (err) {
          console.warn('[Peer] Negotiation error:', err)
        }
      }

      pc.onicecandidate = event => {
        if (event.candidate) {
          socket.send({
            type: 'CANDIDATE',
            dst: peerId,
            payload: {
              connectionId,
              type: 'data',
              candidate: event.candidate.toJSON(),
            },
          })
        }
      }

      channel.onopen = () => {
        const { connection, promise } = createConnection(
          peerId,
          channel,
          options?.metadata,
          codec
        )

        promise
          .then(() => {
            clearTimeout(timeout)
            pendingConnections.delete(connectionId)
            state.connection = connection

            connection.on('close', () => {
              cleanupConnection(connectionId)
            })

            resolve(connection)
          })
          .catch(error => {
            clearTimeout(timeout)
            pendingConnections.delete(connectionId)
            cleanupConnection(connectionId)
            reject(error)
          })
      }

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          clearTimeout(timeout)
          pendingConnections.delete(connectionId)
          cleanupConnection(connectionId)
        }
      }
    })
  }

  function handleDataOffer(message: OfferMessage): void {
    if (destroyed) return

    const { src: _remotePeerId, payload } = message
    const { connectionId, sdp, metadata } = payload

    const pc = makePeerConnection(false, connectionId)
    signalRouter.register(connectionId, pc)

    pc.ondatachannel = event => {
      const channel = event.channel
      channel.binaryType = 'arraybuffer'

      const state: ConnectionState = {
        pc,
        channel,
        peerId: message.src,
      }

      connections.set(connectionId, state)

      channel.onopen = () => {
        const { connection, promise } = createConnection(
          message.src,
          channel,
          metadata,
          codec
        )

        promise
          .then(() => {
            state.connection = connection

            connection.on('close', () => {
              cleanupConnection(connectionId)
            })

            emitter.emit('connection', connection)
          })
          .catch(() => {
            cleanupConnection(connectionId)
          })
      }
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.send({
          type: 'CANDIDATE',
          dst: message.src,
          payload: {
            connectionId,
            type: 'data',
            candidate: event.candidate.toJSON(),
          },
        })
      }
    }

    setRemoteDescription(pc, sdp).then(() => {
      if (pc.localDescription) {
        socket.send({
          type: 'ANSWER',
          dst: message.src,
          payload: {
            connectionId,
            type: 'data',
            sdp: pc.localDescription,
          },
        })
      }
    })

    connections.set(connectionId, { pc, channel: null, peerId: message.src })
  }

  function disconnect(): void {
    if (destroyed) return
    socket.close()
  }

  function destroy(): void {
    if (destroyed) return

    destroyed = true

    for (const state of connections.values()) {
      state.pc.close()
    }

    socket.close()
    emitter.clearAll()
  }

  return {
    id: peerId,
    connect,
    disconnect,
    destroy,
    on: (event: 'connection', handler: (conn: Connection) => void) => {
      emitter.on(event, handler)
    },
    _createMediaPC: (
      remotePeerId: string,
      connectionId: string,
      initiator: boolean,
      onExpire?: (peerId: string) => void
    ) => {
      const pc = makePeerConnection(initiator, connectionId)
      signalRouter.register(connectionId, pc)
      connections.set(connectionId, {
        pc,
        channel: null,
        peerId: remotePeerId,
        onExpire,
      })
      return pc
    },
    _sendSignal: (
      dst: string,
      type: 'OFFER' | 'ANSWER' | 'CANDIDATE',
      payload: any
    ) => {
      socket.send({
        type,
        dst,
        payload,
      } as any)
    },
    _getSocket: () => socket,
    _getRouter: () => signalRouter,
  }
}
