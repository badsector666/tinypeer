# Migrating from PeerJS Client

TinyPeer is compatible with PeerJS signaling servers and uses a more modern client API. Here are the key differences:

## API Changes

- **Promises for async operations** - `createPeer()` and `connect()` return promises
- **Synchronous call initiation** - `call()` returns `MediaConnection` immediately (like PeerJS)
- **Promise-based streams** - `await call.stream` instead of event-only access
- **No `open` event needed** - Promises resolve when ready
- **Explicit rejection** - `call.reject()` method for clear call rejection
- **Simplified binary data support** - Send `ArrayBuffer`/`TypedArray` directly with optional metadata
- **No binary in JSON** - Binary data must be sent separately (use metadata for context)
- **Minimal API** - Only essential events and methods
- **No WebRTC shims** - TinyPeer does not include webrtc-adapter that stabilizes behavior across browsers.

## Benefits

- **Smaller bundle** - ~4.01 KB min+gzipped vs ~31 KB min+gzipped for PeerJS client
- **Modern async/await** - Cleaner code with promises
- **Full compatibility** - Works with existing PeerJS servers

## Migration Example

### Data Connections

#### PeerJS
```typescript
const peer = new Peer('my-id')

peer.on('open', () => {
  const conn = peer.connect('other-peer')

  conn.on('open', () => {
    conn.send('Hello!')
  })
})
```

#### TinyPeer
```typescript
const peer = await createPeer({ id: 'my-id' })
const conn = await peer.connect('other-peer')
await conn.send('Hello!')
```

### Media Calls

#### PeerJS
```typescript
const peer = new Peer('my-id')

peer.on('open', () => {
  const call = peer.call('other-peer', localStream)

  call.on('stream', (remoteStream) => {
    // Use remoteStream
  })
})
```

#### TinyPeer
```typescript
const peer = await createPeer({ id: 'my-id' })
const call = peer.call('other-peer', localStream)
const remoteStream = await call.stream
// Use remoteStream
```
