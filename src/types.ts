export type PeerOptions = {
  id?: string // Peer ID, auto-generated if not provided
  host?: string // PeerServer host (default: '0.peerjs.com')
  port?: number // PeerServer port (default: 443)
  path?: string // PeerServer path (default: '/peerjs')
  key?: string // API key (default: 'peerjs')
  secure?: boolean // Use WSS/HTTPS (default: true)
  token?: string // Session token, auto-generated if not provided
  rtcConfig?: RTCConfiguration // Custom WebRTC configuration
  pingInterval?: number // Heartbeat interval in ms (default: 5000)
  codec?: DataCodec // Custom codec for encoding/decoding data (default: textCodec)
}

export type Peer = {
  id: string
  connect: (peerId: string, options?: ConnectOptions) => Promise<Connection>
  call: (
    peerId: string,
    stream: MediaStream,
    options?: CallOptions
  ) => Promise<MediaConnection>
  disconnect: () => void
  destroy: () => void
  on: ((event: 'connection', handler: (conn: Connection) => void) => void) &
    ((event: 'call', handler: (call: MediaConnection) => void) => void)
}

export type DataCodec = {
  encode: (data: unknown, metadata?: unknown) => ArrayBuffer | ArrayBufferLike
  decode: (buffer: ArrayBuffer | ArrayBufferLike) => {
    data: unknown
    metadata?: unknown
  }
}

export type Connection = {
  peer: string // Remote peer ID
  metadata?: unknown // Metadata provided during connection
  send: (data: unknown, metadata?: unknown) => Promise<void>
  close: () => void
  on: ((
    event: 'data',
    handler: (data: unknown, metadata?: unknown) => void
  ) => void) &
    ((event: 'close', handler: () => void) => void) &
    ((event: 'error', handler: (error: Error) => void) => void)
}

export type ConnectOptions = {
  metadata?: unknown // Custom metadata to send with connection request
  reliable?: boolean // Use reliable/ordered data channel (default: true)
  connectionTimeout?: number // Connection timeout in ms (default: 30000)
}

export type MediaConnection = {
  peer: string
  metadata?: unknown
  stream: Promise<MediaStream>
  answer: (stream?: MediaStream) => Promise<void>
  reject: () => Promise<void>
  close: () => void
  on: ((event: 'stream', handler: (stream: MediaStream) => void) => void) &
    ((event: 'close', handler: () => void) => void) &
    ((event: 'error', handler: (error: Error) => void) => void)
}

export type CallOptions = {
  metadata?: unknown
  connectionTimeout?: number
}

export const DEFAULT_CONFIG: Required<
  Omit<PeerOptions, 'id' | 'token' | 'rtcConfig' | 'codec'>
> = {
  host: '0.peerjs.com',
  port: 443,
  path: '/peerjs',
  key: 'peerjs',
  secure: true,
  pingInterval: 5000,
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

export type OpenMessage = {
  type: 'OPEN'
  payload: {
    id: string
  }
}

export type ErrorMessage = {
  type: 'ERROR'
  payload: {
    msg: string
  }
}

export type IdTakenMessage = {
  type: 'ID-TAKEN'
  payload: {
    msg: string
  }
}

export type InvalidKeyMessage = {
  type: 'INVALID-KEY'
  payload: {
    msg: string
  }
}

export type ExpireMessage = {
  type: 'EXPIRE'
  src: string // The peer that failed to respond
}

export type LeaveMessage = {
  type: 'LEAVE'
  payload: {
    src: string
  }
}

export type OfferMessage = {
  type: 'OFFER'
  payload: {
    connectionId: string
    type: 'data' | 'media'
    metadata?: unknown
    sdp: RTCSessionDescriptionInit
    label?: string
    serialization?: 'json'
    reliable?: boolean
  }
  src: string
}

export type AnswerMessage = {
  type: 'ANSWER'
  payload: {
    connectionId: string
    type: 'data' | 'media'
    sdp: RTCSessionDescriptionInit
  }
  src: string
}

export type CandidateMessage = {
  type: 'CANDIDATE'
  payload: {
    connectionId: string
    type: 'data' | 'media'
    candidate: RTCIceCandidateInit
  }
  src: string
}

export type ServerMessage =
  | OpenMessage
  | ErrorMessage
  | IdTakenMessage
  | InvalidKeyMessage
  | LeaveMessage
  | OfferMessage
  | AnswerMessage
  | CandidateMessage
  | ExpireMessage

export type ClientMessage =
  | HeartbeatMessage
  | ClientOfferMessage
  | ClientAnswerMessage
  | ClientCandidateMessage
  | ClientLeaveMessage

export type HeartbeatMessage = {
  type: 'HEARTBEAT'
}

export type ClientOfferMessage = {
  type: 'OFFER'
  dst: string
  payload: {
    connectionId: string
    type: 'data' | 'media'
    metadata?: unknown
    sdp: RTCSessionDescriptionInit
    label?: string
    serialization?: 'json'
    reliable?: boolean
  }
}

export type ClientAnswerMessage = {
  type: 'ANSWER'
  dst: string
  payload: {
    connectionId: string
    type: 'data' | 'media'
    sdp: RTCSessionDescriptionInit
  }
}

export type ClientCandidateMessage = {
  type: 'CANDIDATE'
  dst: string
  payload: {
    connectionId: string
    type: 'data' | 'media'
    candidate: RTCIceCandidateInit
  }
}

export type ClientLeaveMessage = {
  type: 'LEAVE'
}

export type InternalConfig = Required<
  Omit<PeerOptions, 'rtcConfig' | 'codec'>
> & {
  rtcConfig?: RTCConfiguration
}
