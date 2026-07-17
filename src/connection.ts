import type { Connection, DataCodec } from './types.js'
import { generateId } from './utils.js'
import { textCodec } from './codec.js'

const BUFFER_FALLBACK = 16 * 1024

export function generateConnectionId(): string {
  return `dc_${generateId()}`
}

export function generateMediaConnectionId(): string {
  return `mc_${generateId()}`
}

type ConnectionFactoryResult = {
  connection: Connection
  promise: Promise<void>
}

export function createConnection(
  peerId: string,
  channel: RTCDataChannel,
  metadata?: unknown,
  codec: DataCodec = textCodec
): ConnectionFactoryResult {
  const handlers: {
    data?: (data: unknown, metadata?: unknown) => void
    close?: () => void
    error?: (error: Error) => void
  } = {}

  let isClosed = false

  channel.binaryType = 'arraybuffer'

  channel.onmessage = (event: MessageEvent) => {
    try {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('Expected ArrayBuffer from data channel')
      }
      const { data, metadata } = codec.decode(event.data)
      handlers.data?.(data, metadata)
    } catch (error) {
      handlers.error?.(
        error instanceof Error
          ? error
          : new Error('Failed to parse incoming data')
      )
    }
  }

  channel.onclose = () => {
    if (!isClosed) {
      isClosed = true
      handlers.close?.()
    }
  }

  channel.onerror = () => {
    handlers.error?.(new Error('Data channel error occurred'))
  }

  const openPromise = new Promise<void>((resolve, reject) => {
    if (channel.readyState === 'open') {
      resolve()
      return
    }

    const onOpen = () => {
      cleanup()
      resolve()
    }

    const onError = () => {
      cleanup()
      reject(new Error('Data channel failed to open'))
    }

    const cleanup = () => {
      channel.removeEventListener('open', onOpen)
      channel.removeEventListener('error', onError)
    }

    channel.addEventListener('open', onOpen)
    channel.addEventListener('error', onError)
  })

  const connection: Connection = {
    peer: peerId,
    metadata,
    send: async (data: unknown, sendMetadata?: unknown) => {
      if (isClosed || !channel || channel.readyState === 'closed') throw new Error('Connection closed')
      if (channel.readyState !== 'open') throw new Error('Connection not open')

      const encoded = codec.encode(data, sendMetadata)
      const threshold = channel.bufferedAmountLowThreshold || BUFFER_FALLBACK

      while (channel.bufferedAmount > threshold) {
        await new Promise<void>(resolve => {
          const onLow = () => {
            channel.removeEventListener('bufferedamountlow', onLow)
            resolve()
          }
          channel.addEventListener('bufferedamountlow', onLow)
        })
      }

      channel.send(encoded as any)
    },
    close: () => {
      if (isClosed) return

      isClosed = true

      if (channel && channel.readyState === 'open') {
        channel.close()
      }

      // Trigger close handler immediately
      handlers.close?.()
    },
    on: ((event: string, handler: any) => {
      handlers[event as keyof typeof handlers] = handler
    }) as Connection['on'],
  }

  return {
    connection,
    promise: openPromise,
  }
}
