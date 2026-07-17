import type { InternalConfig } from './config.js'
import type {
  ServerMessage,
  ClientMessage,
  OpenMessage,
  ErrorMessage,
  LeaveMessage,
  OfferMessage,
  AnswerMessage,
  CandidateMessage,
  ExpireMessage,
} from './messages.js'

export type SocketEvents = {
  open: (id: string) => void
  message: (message: ServerMessage) => void
  serverError: (error: ErrorMessage) => void
  leave: (peerId: string) => void
  offer: (message: OfferMessage) => void
  answer: (message: AnswerMessage) => void
  candidate: (message: CandidateMessage) => void
  expire: (peerId: string) => void
  close: () => void
  error: (error: Error) => void
}

export type Socket = {
  send: (message: ClientMessage) => void
  close: () => void
  on: <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => void
}

export function createSocket(config: InternalConfig): Socket {
  const handlers: Partial<SocketEvents> = {}
  const messageQueue: ClientMessage[] = []
  let ws: WebSocket | null = null
  let isOpen = false
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  const requestedId = config.id

  const protocol = config.secure ? 'wss' : 'ws'
  const url = buildUrl(protocol, config)

  try {
    ws = new WebSocket(url)
  } catch (error) {
    throw new Error(
      `Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  const startHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }
    heartbeatTimer = setInterval(() => {
      if (ws && isOpen && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT' }))
      }
    }, config.pingInterval)
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  ws.onopen = () => {
    isOpen = true
    startHeartbeat()
    while (messageQueue.length > 0) {
      const message = messageQueue.shift()
      if (message && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    }
  }

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data) as ServerMessage

      handlers.message?.(message)
      routeMessage(message, handlers, requestedId)
    } catch (error) {
      handlers.error?.(
        new Error(
          `Failed to parse server message: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  }

  ws.onclose = () => {
    isOpen = false
    stopHeartbeat()
    ws = null
    handlers.close?.()
  }

  ws.onerror = () => {
    handlers.error?.(new Error('WebSocket connection error'))
  }

  return {
    send: (message: ClientMessage) => {
      if (ws && isOpen && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      } else {
        messageQueue.push(message)
      }
    },

    close: () => {
      stopHeartbeat()
      if (ws) {
        ws.close()
        ws = null
      }
      isOpen = false
    },

    on: <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => {
      handlers[event] = handler as any
    },
  }
}

function routeMessage(
  message: ServerMessage,
  handlers: Partial<SocketEvents>,
  requestedId?: string
): void {
  switch (message.type) {
    case 'OPEN':
      const openMsg = message as OpenMessage
      const id = openMsg.payload?.id || requestedId || ''
      handlers.open?.(id)
      break

    case 'ERROR':
    case 'INVALID-KEY':
    case 'ID-TAKEN':
      handlers.serverError?.(message as ErrorMessage)
      break

    case 'LEAVE':
      handlers.leave?.((message as LeaveMessage).payload.src)
      break

    case 'OFFER':
      handlers.offer?.(message as OfferMessage)
      break

    case 'ANSWER':
      handlers.answer?.(message as AnswerMessage)
      break

    case 'CANDIDATE':
      handlers.candidate?.(message as CandidateMessage)
      break

    case 'EXPIRE':
      handlers.expire?.((message as ExpireMessage).src)
      break

    default:
      break
  }
}

// Format: wss://host:port/path?key={key}&id={id}&token={token}&version=1.0.0
function buildUrl(protocol: string, config: InternalConfig): string {
  const { host, port, path, key, id, token } = config

  const cleanPath = path.startsWith('/') ? path : `/${path}`

  const params = new URLSearchParams({
    key,
    id,
    token,
    version: '1.0.0',
  })

  return `${protocol}://${host}:${port}${cleanPath}?${params.toString()}`
}
