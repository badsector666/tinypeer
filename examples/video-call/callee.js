import { createPeer } from '../../src/index.js'

const peerIdEl = document.getElementById('peer-id')
const statusEl = document.getElementById('status')
const localVideo = document.getElementById('local-video')
const remoteVideo = document.getElementById('remote-video')

const peer = await createPeer()
peerIdEl.textContent = peer.id

peer.on('call', async (call) => {
  statusEl.textContent = `Incoming call from ${call.peer}...`

  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    localVideo.srcObject = localStream

    await call.answer(localStream)
    statusEl.textContent = 'Call connected'

    const remoteStream = await call.stream
    remoteVideo.srcObject = remoteStream

    call.on('close', () => {
      statusEl.textContent = 'Call ended'
      localStream.getTracks().forEach(track => track.stop())
      localVideo.srcObject = null
      remoteVideo.srcObject = null
    })

    call.on('error', (error) => {
      alert('Call error: ' + error.message)
      statusEl.textContent = 'Call error'
    })
  } catch (error) {
    statusEl.textContent = 'Failed to answer call'
    alert('Failed to answer call: ' + error.message)
    await call.reject()
  }
})
