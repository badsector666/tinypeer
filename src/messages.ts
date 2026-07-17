// Shared signaling payload base (internal, not exported)
type BasePayload = {
  connectionId: string
  type: 'data' | 'media'
}

type OfferPayload = BasePayload & {
  metadata?: unknown
  sdp: RTCSessionDescriptionInit
  label?: string
  serialization?: 'json'
  reliable?: boolean
}

type AnswerPayload = BasePayload & {
  sdp: RTCSessionDescriptionInit
}

type CandidatePayload = BasePayload & {
  candidate: RTCIceCandidateInit
}

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
  src: string
}

export type LeaveMessage = {
  type: 'LEAVE'
  payload: {
    src: string
  }
}

export type OfferMessage = {
  type: 'OFFER'
  payload: OfferPayload
  src: string
}

export type AnswerMessage = {
  type: 'ANSWER'
  payload: AnswerPayload
  src: string
}

export type CandidateMessage = {
  type: 'CANDIDATE'
  payload: CandidatePayload
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

export type HeartbeatMessage = {
  type: 'HEARTBEAT'
}

export type ClientOfferMessage = {
  type: 'OFFER'
  dst: string
  payload: OfferPayload
}

export type ClientAnswerMessage = {
  type: 'ANSWER'
  dst: string
  payload: AnswerPayload
}

export type ClientCandidateMessage = {
  type: 'CANDIDATE'
  dst: string
  payload: CandidatePayload
}

export type ClientLeaveMessage = {
  type: 'LEAVE'
}

export type ClientMessage =
  | HeartbeatMessage
  | ClientOfferMessage
  | ClientAnswerMessage
  | ClientCandidateMessage
  | ClientLeaveMessage
