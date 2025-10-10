# TinyPeer Examples

Simple, minimal examples demonstrating TinyPeer features.

## Running the Examples

```bash
npm run examples
```

This will start a Vite dev server and open the examples index page in your browser.

## Examples

### Basic Connection (Data Channels)

Demonstrates peer-to-peer data communication using data channels.

- **Host** (`/basic-connection/host.html`) - Accepts connections from other peers and broadcasts messages
- **Client** (`/basic-connection/client.html`) - Connects to a host and exchanges messages

**How to test:**

1. Open the host page - a random peer ID will be generated and displayed
2. Copy the host's peer ID
3. Open the client page in another window/tab
4. Paste the host's peer ID and click "Connect"
5. Send messages back and forth

### Video Call

Demonstrates peer-to-peer video/audio calling.

- **Caller** (`/video-call/caller.html`) - Initiates a video call
- **Callee** (`/video-call/callee.html`) - Receives a video call

**How to test:**

1. Open the callee page first - a random peer ID will be generated and displayed
2. Copy the callee's peer ID
3. Open the caller page in another window/tab
4. Paste the callee's peer ID and click "Start Call"
5. Allow camera/microphone access when prompted on both pages
6. Both peers should now see each other's video streams

### Simple Chat

A minimal 1-to-1 peer-to-peer chat application.

- **Chat** (`/chat/index.html`) - Can both initiate and receive connections

**How to test:**

1. Open the chat page - note your peer ID
2. Open another chat page in a different window/tab
3. Copy the first peer's ID and paste it in the second peer's connection field
4. Click "Connect" and start chatting
