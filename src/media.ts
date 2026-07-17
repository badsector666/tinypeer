import type { MediaConnection } from './types.js'
import type { OfferMessage } from './messages.js'
import type { PeerCoreInternal } from './peer-core.js'
import { generateMediaConnectionId } from './connection.js'

type MediaHandlers = {
  stream?: (stream: MediaStream) => void
  close?: () => void
  error?: (error: Error) => void
}

type MediaBaseState = {
  streamResolve: ((stream: MediaStream) => void) | undefined
  streamReject: ((error: Error) => void) | undefined
  isClosed: boolean
  timer: ReturnType<typeof setTimeout> | undefined
}

function createStreamState(): MediaBaseState {
  return {
    streamResolve: undefined,
    streamReject: undefined,
    isClosed: false,
    timer: undefined,
  }
}

function setupMediaEventHandlers(
  pc: RTCPeerConnection,
  peerId: string,
  connectionId: string,
  core: PeerCoreInternal,
  state: MediaBaseState,
  handlers: MediaHandlers,
): void {
  pc.ontrack = event => {
    const remoteStream = event.streams?.[0]
    if (remoteStream && state.streamResolve) {
      clearTimeout(state.timer)
      state.streamResolve(remoteStream)
      state.streamResolve = undefined
      state.streamReject = undefined
      handlers.stream?.(remoteStream)
    }
  }

  pc.onicecandidate = event => {
    if (event.candidate) {
      core._sendSignal(peerId, 'CANDIDATE', {
        connectionId,
        type: 'media',
        candidate: event.candidate.toJSON(),
      })
    }
  }

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      clearTimeout(state.timer)
      if (!state.isClosed) {
        state.isClosed = true
        if (state.streamReject) {
          state.streamReject(new Error('Media connection closed'))
        }
        handlers.close?.()
      }
    }
  }
}

function closeMedia(
  state: MediaBaseState,
  handlers: MediaHandlers,
  pc: RTCPeerConnection,
  errorMessage: string,
): void {
  if (state.isClosed) return

  state.isClosed = true
  clearTimeout(state.timer)

  if (state.streamReject) {
    state.streamReject(new Error(errorMessage))
    state.streamReject = undefined
    state.streamResolve = undefined
  }

  handlers.close?.()
  pc.close()
}

export function createMediaCall(
  core: PeerCoreInternal,
  peerId: string,
  stream: MediaStream,
  metadata?: unknown,
  timeout = 30000
): MediaConnection {
  const connectionId = generateMediaConnectionId()
  const handlers: MediaHandlers = {}
  const state = createStreamState()

  const pc = core._createMediaPC(peerId, connectionId, true, expiredPeerId => {
    if (!state.isClosed) {
      if (state.timer) clearTimeout(state.timer)
      state.isClosed = true
      if (state.streamReject) {
        state.streamReject(new Error(`Could not connect to peer ${expiredPeerId}`))
        state.streamReject = undefined
        state.streamResolve = undefined
      }
      handlers.close?.()
    }
  })

  const streamPromise = new Promise<MediaStream>((res, rej) => {
    state.streamResolve = res
    state.streamReject = rej
  })
  streamPromise.catch(() => {})

  state.timer = setTimeout(() => {
    if (!state.isClosed && state.streamReject) {
      state.isClosed = true
      state.streamReject(new Error('Media connection timeout'))
      state.streamReject = undefined
      state.streamResolve = undefined
    }
    pc.close()
  }, timeout)

  try {
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream)
    }
  } catch (err) {
    console.warn('[Peer] Failed to add track (PC may be closed):', err)
  }

  setupMediaEventHandlers(pc, peerId, connectionId, core, state, handlers)

  pc.onnegotiationneeded = async () => {
    try {
      await pc.setLocalDescription()

      if (pc.localDescription) {
        core._sendSignal(peerId, 'OFFER', {
          connectionId,
          type: 'media',
          metadata,
          sdp: pc.localDescription,
        })
      }
    } catch (err) {
      console.warn('[Peer] Negotiation error:', err)
    }
  }

  const mediaConnection: MediaConnection = {
    peer: peerId,
    metadata,
    stream: streamPromise,
    answer: async () => {
      throw new Error('Cannot answer: this is not an incoming call')
    },
    reject: async () => {
      closeMedia(state, handlers, pc, 'Media connection rejected')
    },
    close: () => {
      closeMedia(state, handlers, pc, 'Media connection closed by local user')
    },
    on: ((event: string, handler: any) => {
      handlers[event as keyof MediaHandlers] = handler
    }) as MediaConnection['on'],
  }

  return mediaConnection
}

export function handleIncomingMediaOffer(
  core: PeerCoreInternal,
  message: OfferMessage,
  onCall: (call: MediaConnection) => void
): void {
  const { src: peerId, payload } = message
  const { connectionId, sdp, metadata } = payload

  const pc = core._createMediaPC(peerId, connectionId, false)
  const handlers: MediaHandlers = {}
  const state = createStreamState()
  let isAnswered = false

  const streamPromise = new Promise<MediaStream>((resolve, reject) => {
    state.streamResolve = resolve
    state.streamReject = reject
  })
  streamPromise.catch(() => {})

  state.timer = setTimeout(() => {
    if (!state.isClosed && state.streamReject) {
      state.streamReject(new Error('Media connection timeout: no stream received'))
    }
  }, 30000)

  setupMediaEventHandlers(pc, peerId, connectionId, core, state, handlers)

  // Override onconnectionstatechange to respect isAnswered for stream rejection
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      clearTimeout(state.timer)
      if (!state.isClosed) {
        state.isClosed = true
        if (state.streamReject && !isAnswered) {
          state.streamReject(new Error('Media connection closed'))
        }
        handlers.close?.()
      }
    }
  }

  const mediaConnection: MediaConnection = {
    peer: peerId,
    metadata,
    stream: streamPromise,
    answer: async (stream?: MediaStream) => {
      if (state.isClosed) {
        throw new Error('Cannot answer: media connection is closed')
      }

      if (isAnswered) {
        throw new Error('Media connection already answered')
      }

      isAnswered = true

      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream)
        }
      }

      await pc.setLocalDescription()

      if (pc.localDescription) {
        core._sendSignal(peerId, 'ANSWER', {
          connectionId,
          type: 'media',
          sdp: pc.localDescription,
        })
      }
    },
    reject: async () => {
      closeMedia(state, handlers, pc, 'Media connection rejected by remote peer')
    },
    close: () => {
      closeMedia(state, handlers, pc, 'Media connection closed by local user')
    },
    on: ((event: string, handler: any) => {
      handlers[event as keyof MediaHandlers] = handler
    }) as MediaConnection['on'],
  }

  pc.setRemoteDescription(sdp).catch(() => {
    pc.close()
  })

  onCall(mediaConnection)
}
