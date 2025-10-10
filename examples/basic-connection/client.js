import { createPeer } from '../../src/index.js'

const peerIdEl = document.getElementById('peer-id')
const connectedToEl = document.getElementById('connected-to')
const messagesEl = document.getElementById('messages')
const hostIdInput = document.getElementById('host-id')
const connectBtn = document.getElementById('connect-btn')
const messageInput = document.getElementById('message-input')
const sendBtn = document.getElementById('send-btn')

let hostConnection = null

const peer = await createPeer()
peerIdEl.textContent = peer.id

connectBtn.addEventListener('click', async () => {
  const hostId = hostIdInput.value
  if (!hostId) return

  connectBtn.disabled = true
  connectBtn.textContent = 'Connecting...'

  try {
    hostConnection = await peer.connect(hostId, {
      metadata: { username: 'Client' + Math.floor(Math.random() * 1000) },
    })

    connectedToEl.textContent = hostId
    connectBtn.textContent = 'Connected'

    hostConnection.on('data', data => {
      const li = document.createElement('li')
      li.textContent = `Host: ${JSON.stringify(data)}`
      messagesEl.appendChild(li)
    })

    hostConnection.on('close', () => {
      connectedToEl.textContent = 'Disconnected'
      connectBtn.disabled = false
      connectBtn.textContent = 'Connect'
    })
  } catch (error) {
    connectBtn.disabled = false
    connectBtn.textContent = 'Connect'
    alert('Connection failed: ' + error.message)
  }
})

sendBtn.addEventListener('click', async () => {
  if (!hostConnection) {
    alert('Not connected to host')
    return
  }

  const message = messageInput.value
  if (!message) return

  await hostConnection.send({ type: 'message', text: message })

  const li = document.createElement('li')
  li.textContent = `You: ${message}`
  messagesEl.appendChild(li)

  messageInput.value = ''
})
