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
  ) => MediaConnection
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
