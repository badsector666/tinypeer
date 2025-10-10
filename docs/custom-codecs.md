# Custom Data Encoding

TinyPeer uses a lightweight default codec that handles JSON, strings, and binary data. For advanced use cases (like binary data nested in objects), you can provide a custom codec when creating the peer:

```typescript
import { createPeer, type DataCodec } from 'tinypeer'
import { encode, decode } from 'msgpackr' // or any serialization library

const msgpackCodec: DataCodec = {
  encode: (data, metadata) => {
    // Custom encoding logic
    return encode({ data, metadata })
  },
  decode: (buffer) => {
    // Custom decoding logic
    const { data, metadata } = decode(new Uint8Array(buffer))
    return { data, metadata }
  }
}

// Create peer with custom codec
const peer = await createPeer({
  id: 'my-peer',
  codec: msgpackCodec
})

// All connections (incoming and outgoing) use the custom codec
const conn = await peer.connect('other-peer')

// Now you can send objects with binary data
await conn.send({
  message: 'Hello',
  image: new Uint8Array([...]) // Works with custom codec!
})

// Incoming connections also use the custom codec
peer.on('connection', (conn) => {
  // This connection automatically uses msgpackCodec
})
```

## When to Use a Custom Codec

- You need to send objects containing binary data
- You want custom serialization (MessagePack, CBOR, Protocol Buffers, etc.)
- You need compression or encryption

## Important Notes

The codec is configured at the peer level. All connections (incoming and outgoing) for that peer will use the same codec. Both peers must use compatible codecs for successful communication.
