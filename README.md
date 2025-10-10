# TinyPeer

[![npm version](https://img.shields.io/npm/v/tinypeer.svg)](https://www.npmjs.com/package/tinypeer)
[![license](https://img.shields.io/npm/l/tinypeer.svg)](https://github.com/jamsinclair/tinypeer/blob/main/LICENSE.md)
[![bundlephobia minzipped size](https://badgen.net/bundlephobia/minzip/tinypeer)](https://bundlephobia.com/package/tinypeer)

A minimalistic, modern peer-to-peer library for the browser. Compatible with PeerJS servers.

## Why TinyPeer?

- **Simple** - Functional design, minimal API surface
- **Modern** - ES2020+, TypeScript, ESM-only, Promise-based
- **Full-featured** - Data channels + media streaming (audio/video)
- **Tiny** - ~4.01 KB minified + gzipped
- **Compatible** - Works with existing PeerJS servers
- **Zero dependencies**

Build multiplayer games, collaborative tools, video chat apps, and real-time experiences without a backend.

## Installation

```bash
npm install tinypeer
```

## Quick Start

### Client connecting to peer

```typescript
import { createPeer } from 'tinypeer'

const peer = await createPeer()

const conn = await peer.connect('host-peer-id', {
  metadata: { username: 'Alice' }
})

await conn.send({ message: 'Hello!' })

conn.on('data', (data) => {
  console.log('Received:', data)
})
```

### Host accepting connections

```typescript
import { createPeer } from 'tinypeer'

const peer = await createPeer({ id: 'host-peer-id' })

peer.on('connection', async (conn) => {
  console.log(`${conn.peerId } connected`)

  await conn.send({ message: 'Welcome!' })

  conn.on('data', (data) => {
    console.log('Received:', data)
  })
})

console.log(`Listening with ID: ${peer.id}`)
```

## API

### `createPeer(options?): Promise<Peer>`

Creates a new peer instance. Resolves when connected to the signaling server.

```typescript
const peer = await createPeer({
  id: 'my-peer',           // Optional: auto-generated if not provided
  host: '0.peerjs.com',    // Optional: PeerJS server host
  port: 443,               // Optional: PeerJS server port
  path: '/peerjs',         // Optional: PeerJS server path
  key: 'peerjs',           // Optional: API key
  secure: true,            // Optional: Use WSS/HTTPS
  pingInterval: 5000,      // Optional: Heartbeat interval in ms
  rtcConfig: {...},        // Optional: Custom RTCConfiguration 
})
```

### `Peer`

**Properties:**
- `id` - Your peer ID

**Methods:**
- `connect(peerId, options?)` - Connect to another peer
- `call(peerId, stream, options?)` - Call another peer with media
- `disconnect()` - Close signaling connection
- `destroy()` - Close all connections
- `on('connection', handler)` - Handle incoming connections
- `on('call', handler)` - Handle incoming calls

#### `peer.connect(peerId, options?): Promise<Connection>`

Initiates a connection to another peer. Resolves when the connection is open and ready.

```typescript
const conn = await peer.connect('other-peer', {
  metadata: { username: 'Alice' },  // Optional: custom metadata
  reliable: true,                   // Use reliable/ordered data channel
})
```

#### `peer.call(peerId, stream, options?): Promise<MediaConnection>`

Initiates a media call to another peer. Resolves when the call is established.

```typescript
const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
const call = await peer.call('other-peer', localStream, {
  metadata: { username: 'Alice' }
})
const remoteStream = await call.stream
```

#### `peer.on('connection', handler)`

Fires when another peer connects to you for data. The connection is already open when this event fires.

```typescript
peer.on('connection', async (conn) => {
  console.log(`${conn.peer} connected`)
  console.log('Metadata:', conn.metadata)
  await conn.send({ welcome: true })
})
```

#### `peer.on('call', handler)`

Fires when another peer calls you for media. The call is ready but not yet answered.

```typescript
peer.on('call', async (call) => {
  console.log(`Call from ${call.peer}`)
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  await call.answer(stream)
  const remoteStream = await call.stream
})
```

#### `peer.disconnect()`

Closes the signaling connection but keeps peer-to-peer connections alive.

#### `peer.destroy()`

Closes all connections and disconnects from the signaling server.

### `Connection`

**Properties:**
- `peer` - Remote peer ID
- `metadata` - Optional connection metadata

**Methods:**
- `send(data, metadata?)` - Send data to peer
- `close()` - Close the connection
- `on('data', handler)` - Handle incoming data
- `on('close', handler)` - Handle connection close
- `on('error', handler)` - Handle errors

#### `connection.send(data, metadata?): Promise<void>`

Sends data with optional metadata. Supports JSON objects, strings, and binary data (ArrayBuffer/TypedArray).

```typescript
// Send JSON
await connection.send({ type: 'move', x: 10, y: 20 })

// Send binary with metadata
const imageData = new Uint8Array(imageBytes)
await connection.send(imageData, {
  filename: 'photo.jpg',
  type: 'image/jpeg'
})
```

**Note:** Binary data cannot be nested in JSON. Use the metadata parameter instead:

```typescript
// ❌ Won't work
await connection.send({ image: new Uint8Array([...]) })

// ✅ Works
await connection.send(new Uint8Array([...]), { type: 'image' })
```

#### `connection.on('data', handler)`

Fires when data is received from the remote peer.

```typescript
connection.on('data', (data, metadata) => {
  console.log('Received:', data)

  // Handle different data types
  if (data instanceof Uint8Array) {
    console.log('Binary data received:', data.byteLength, 'bytes')
    if (metadata?.type === 'image/jpeg') {
      displayImage(data, metadata.filename)
    }
  } else if (typeof data === 'string') {
    console.log('String:', data)
  } else {
    console.log('JSON object:', data)
  }
})
```

#### `connection.on('close', handler)`

Fires when the connection closes.

#### `connection.on('error', handler)`

Fires when a connection error occurs.

#### `connection.close()`

Closes the connection.

### `MediaConnection`

**Properties:**
- `peer` - Remote peer ID
- `metadata` - Optional call metadata
- `stream` - Promise that resolves with remote MediaStream

**Methods:**
- `answer(stream?)` - Answer the call
- `reject()` - Reject the call
- `close()` - End the call
- `on('stream', handler)` - Handle remote stream
- `on('close', handler)` - Handle call close
- `on('error', handler)` - Handle errors

#### `call.stream: Promise<MediaStream>`

Promise that resolves with the remote media stream. Rejects if call fails or is rejected.

```typescript
try {
  const remoteStream = await call.stream
  videoEl.srcObject = remoteStream
} catch (error) {
  console.log('Call failed:', error.message)
}
```

#### `call.answer(stream?): Promise<void>`

Answer an incoming call, optionally with a local stream.

```typescript
// With local stream
const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
await call.answer(localStream)

// Without local stream (receive-only)
await call.answer()
```

#### `call.reject(): Promise<void>`

Reject an incoming call. The caller's `call.stream` promise will reject.

```typescript
peer.on('call', async (call) => {
  if (!userAccepts) {
    await call.reject()
  }
})
```

#### `call.on('stream', handler)`

Fires when remote stream is received.

#### `call.on('close', handler)`

Fires when the call closes.

#### `call.on('error', handler)`

Fires when a call error occurs.

#### `call.close()`

End the call.

## Examples

### Video Call

```typescript
import { createPeer } from 'tinypeer'

// Caller
const caller = await createPeer({ id: 'alice' })
const localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
})

localVideoEl.srcObject = localStream

const call = await caller.call('bob', localStream)
const remoteStream = await call.stream
remoteVideoEl.srcObject = remoteStream

// Callee (separate peer)
const callee = await createPeer({ id: 'bob' })

callee.on('call', async (call) => {
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  await call.answer(localStream)

  const remoteStream = await call.stream
  remoteVideoEl.srcObject = remoteStream
})

// Variations:
// Audio only: { audio: true, video: false }
// Screen share: navigator.mediaDevices.getDisplayMedia({ video: true })
// Receive only: await call.answer() without a stream
```

### Broadcasting to Multiple Peers

```typescript
import { createPeer } from 'tinypeer'

const host = await createPeer({ id: 'room-host' })
const connections = new Map()

host.on('connection', async (conn) => {
  connections.set(conn.peer, conn)

  conn.on('data', (data) => {
    // Broadcast to all other peers
    for (const [id, connection] of connections) {
      if (id !== conn.peer) {
        connection.send({ from: conn.peer, data })
      }
    }
  })

  conn.on('close', () => {
    connections.delete(conn.peer)
  })
})
```

For more examples (like multiplayer games), see the [`examples/`](examples/) directory.

## Advanced

### Custom Data Encoding

For advanced serialization (MessagePack, CBOR, etc.), compression, or encryption, see [Custom Codecs](docs/custom-codecs.md).

### Data-Only Peer

For applications that only need data channels (no video/audio), you can use `createDataPeer()` for a smaller bundle size:

```typescript
import { createDataPeer } from 'tinypeer'

const peer = await createDataPeer({ id: 'my-peer' })

// All connection features work the same
const conn = await peer.connect('other-peer')
await conn.send({ message: 'Hello!' })

peer.on('connection', (conn) => {
  console.log(`${conn.peer} connected`)
})
```

**Benefits:**
- Smaller bundle size 3.24KB (no media connection code)
- Same API as `createPeer()` for data connections
- Perfect for multiplayer games, chat apps, collaborative tools

**What's different:**
- No `call()` method - data connections only
- No `on('call')` event - won't receive media calls

### Migrating from PeerJS

See the [Migration Guide](docs/migrating-from-peerjs.md) for API differences and examples.
  
## Browser Support

Aims to support all modern browsers with WebRTC support.

Part of Peer.js's bundle size comes from support for old browsers and stabilising the WebRTC APIs across browsers. TinyPeer uses modern APIs and assumes a recent browser version (ES2020+).

If there is a notable browser quirk or bug, please [open an issue](https://github.com/jamsinclair/tinypeer/issues).

## License

MIT

## Inspired By

- [PeerJS](https://peerjs.com/)
- [Trystero](https://github.com/dmotz/trystero)
