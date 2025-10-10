import { createPeer } from '../../src/index.js'

const peerIdEl = document.getElementById('peer-id')
const usernameInput = document.getElementById('username')
const remoteIdInput = document.getElementById('remote-id')
const connectBtn = document.getElementById('connect-btn')
const statusEl = document.getElementById('status')
const messagesEl = document.getElementById('messages')
const messageInput = document.getElementById('message-input')
const sendBtn = document.getElementById('send-btn')

let connection = null
let remoteUsername = 'Remote'

const peer = await createPeer({
  id: 'chat-' + Math.floor(Math.random() * 1000)
})
peerIdEl.textContent = peer.id

peer.on('connection', async (conn) => {
  if (connection) {
    conn.close()
    return
  }

  connection = conn
  statusEl.textContent = `Connected to ${conn.peer}`
  connectBtn.disabled = true

  connection.on('data', (data) => {
    if (data.type === 'username') {
      remoteUsername = data.username
    } else if (data.type === 'message') {
      console.log('Received message:', data.text)
      const li = document.createElement('li')
      li.textContent = `${remoteUsername}: ${data.text}`
      messagesEl.appendChild(li)
    }
  })

  connection.on('close', () => {
    console.log('Connection closed')
    statusEl.textContent = 'Disconnected'
    connectBtn.disabled = false
    connection = null
  })

  await connection.send({ type: 'username', username: usernameInput.value })
})

connectBtn.addEventListener('click', async () => {
  const remoteId = remoteIdInput.value
  if (!remoteId || connection) return

  connectBtn.disabled = true
  connectBtn.textContent = 'Connecting...'

  try {
    connection = await peer.connect(remoteId, {
      metadata: { username: usernameInput.value }
    })

    statusEl.textContent = `Connected to ${remoteId}`
    connectBtn.textContent = 'Connect'

    connection.on('data', (data) => {
      if (data.type === 'username') {
        remoteUsername = data.username
      } else if (data.type === 'message') {
        const li = document.createElement('li')
        li.textContent = `${remoteUsername}: ${data.text}`
        messagesEl.appendChild(li)
      }
    })

    connection.on('close', () => {
      console.log('Connection closed')
      statusEl.textContent = 'Disconnected'
      connectBtn.disabled = false
      connection = null
    })

    await connection.send({ type: 'username', username: usernameInput.value })
  } catch (error) {
    connectBtn.disabled = false
    connectBtn.textContent = 'Connect'
    alert('Connection failed: ' + error.message)
  }
})

sendBtn.addEventListener('click', async () => {
  if (!connection) {
    alert('Not connected')
    return
  }

  const message = messageInput.value
  if (!message) return

  await connection.send({ type: 'message', text: message })
  console.log('Sent message:', message)

  const li = document.createElement('li')
  li.textContent = `You: ${message}`
  messagesEl.appendChild(li)

  messageInput.value = ''
})

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click()
  }
})
