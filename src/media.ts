import type { MediaConnection, OfferMessage } from './types.js'
import type { PeerCoreInternal } from './peer-core.js'
import { generateMediaConnectionId } from './connection.js'

export function createMediaCall(
  core: PeerCoreInternal,
  peerId: string,
  stream: MediaStream,
  metadata?: unknown,
  timeout = 30000
): MediaConnection {
  const connectionId = generateMediaConnectionId()

  let streamResolve: ((stream: MediaStream) => void) | undefined
  let streamReject: ((error: Error) => void) | undefined
  let isClosed = false
  let timer: NodeJS.Timeout | undefined

  const handlers: {
    stream?: (stream: MediaStream) => void
    close?: () => void
    error?: (error: Error) => void
  } = {}

  const pc = core._createMediaPC(peerId, connectionId, true, expiredPeerId => {
    // Handle EXPIRE: reject stream promise
    if (!isClosed) {
      if (timer) clearTimeout(timer)
      isClosed = true
      const error = new Error(`Could not connect to peer ${expiredPeerId}`)
      if (streamReject) {
        streamReject(error)
        streamReject = undefined
        streamResolve = undefined
      }
      handlers.close?.()
    }
  })

  const streamPromise = new Promise<MediaStream>((res, rej) => {
    streamResolve = res
    streamReject = rej
  })

  streamPromise.catch(() => {})

  timer = setTimeout(() => {
    if (!isClosed && streamReject) {
      isClosed = true
      streamReject(new Error('Media connection timeout'))
      streamReject = undefined
      streamResolve = undefined
    }
    pc.close()
  }, timeout)

  try {
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream)
    }
  } catch {
    // PC might be closed if EXPIRE arrived - ignore, stream will be rejected
  }

  pc.ontrack = event => {
    const remoteStream = event.streams?.[0]
    if (remoteStream && streamResolve) {
      clearTimeout(timer)
      streamResolve(remoteStream)
      streamResolve = undefined
      streamReject = undefined
      handlers.stream?.(remoteStream)
    }
  }

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
    } catch {
      // Ignore negotiation errors
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
      clearTimeout(timer)
      if (!isClosed) {
        isClosed = true
        if (streamReject) {
          streamReject(new Error('Media connection closed'))
        }
        handlers.close?.()
      }
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
      if (isClosed) return

      isClosed = true
      clearTimeout(timer)

      if (streamReject) {
        streamReject(new Error('Media connection rejected'))
        streamReject = undefined
        streamResolve = undefined
      }

      handlers.close?.()
      pc.close()
    },
    close: () => {
      if (isClosed) return

      isClosed = true
      clearTimeout(timer)

      if (streamReject) {
        streamReject(new Error('Media connection closed by local user'))
        streamReject = undefined
        streamResolve = undefined
      }

      handlers.close?.()
      pc.close()
    },
    on: ((event: string, handler: any) => {
      handlers[event as keyof typeof handlers] = handler
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

  const handlers: {
    stream?: (stream: MediaStream) => void
    close?: () => void
    error?: (error: Error) => void
  } = {}

  let streamResolve: ((stream: MediaStream) => void) | undefined
  let streamReject: ((error: Error) => void) | undefined
  let isClosed = false
  let isAnswered = false

  const streamPromise = new Promise<MediaStream>((resolve, reject) => {
    streamResolve = resolve
    streamReject = reject
  })

  streamPromise.catch(() => {})

  const timer = setTimeout(() => {
    if (!isClosed && streamReject) {
      streamReject(new Error('Media connection timeout: no stream received'))
    }
  }, 30000)

  pc.ontrack = event => {
    const stream = event.streams?.[0]
    if (stream && streamResolve) {
      clearTimeout(timer)
      streamResolve(stream)
      streamResolve = undefined
      streamReject = undefined
      handlers.stream?.(stream)
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
      clearTimeout(timer)
      if (!isClosed) {
        isClosed = true
        if (streamReject && !isAnswered) {
          streamReject(new Error('Media connection closed'))
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
      if (isClosed) {
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
      if (isClosed) return

      isClosed = true
      clearTimeout(timer)

      if (streamReject) {
        streamReject(new Error('Media connection rejected by remote peer'))
        streamReject = undefined
        streamResolve = undefined
      }

      handlers.close?.()
      pc.close()
    },
    close: () => {
      if (isClosed) return

      isClosed = true
      clearTimeout(timer)

      if (streamReject) {
        streamReject(new Error('Media connection closed by local user'))
        streamReject = undefined
        streamResolve = undefined
      }

      handlers.close?.()
      pc.close()
    },
    on: ((event: string, handler: any) => {
      handlers[event as keyof typeof handlers] = handler
    }) as MediaConnection['on'],
  }

  pc.setRemoteDescription(sdp).catch(() => {
    pc.close()
  })

  onCall(mediaConnection)
}
