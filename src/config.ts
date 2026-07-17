import type { PeerOptions } from './types.js'

export type InternalConfig = Required<
  Omit<PeerOptions, 'rtcConfig' | 'codec'>
> & {
  rtcConfig?: RTCConfiguration
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
