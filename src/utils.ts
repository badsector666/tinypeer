export function generateId(): string {
  return crypto.randomUUID()
}

export function generateToken(): string {
  return crypto.randomUUID().split('-')[0]!
}

export function isValidId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id)
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encodeText(text: string): Uint8Array {
  return encoder.encode(text)
}

export function decodeText(bytes: ArrayBuffer | Uint8Array): string {
  return decoder.decode(bytes)
}
