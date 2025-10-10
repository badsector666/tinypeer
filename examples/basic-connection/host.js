import { createPeer } from '../../src/index.js'

const peerIdEl = document.getElementById('peer-id')
const connectionsEl = document.getElementById('connections')
const messagesEl = document.getElementById('messages')
const messageInput = document.getElementById('message-input')
const sendBtn = document.getElementById('send-btn')

const connections = new Map()

const peer = await createPeer()
peerIdEl.textContent = peer.id

peer.on('connection', async (conn) => {
  connections.set(conn.peer, conn)

  const li = document.createElement('li')
  li.textContent = `${conn.peer} connected`
  li.id = `conn-${conn.peer}`
  connectionsEl.appendChild(li)

  await conn.send({ type: 'welcome', message: 'Hello from host!' })

  conn.on('data', (data) => {
    const li = document.createElement('li')
    li.textContent = `${conn.peer}: ${JSON.stringify(data)}`
    messagesEl.appendChild(li)
  })

  conn.on('close', () => {
    connections.delete(conn.peer)
    const connLi = document.getElementById(`conn-${conn.peer}`)
    if (connLi) {
      connLi.textContent = `${conn.peer} disconnected`
    }
  })
})

sendBtn.addEventListener('click', async () => {
  const message = messageInput.value
  if (!message) return

  for (const [peerId, conn] of connections) {
    await conn.send({ type: 'message', text: message })
  }

  const li = document.createElement('li')
  li.textContent = `You: ${message}`
  messagesEl.appendChild(li)

  messageInput.value = ''
})
