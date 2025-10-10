import { createPeer } from '../../src/index.js'

const peerIdEl = document.getElementById('peer-id')
const calleeIdInput = document.getElementById('callee-id')
const callBtn = document.getElementById('call-btn')
const localVideo = document.getElementById('local-video')
const remoteVideo = document.getElementById('remote-video')

const peer = await createPeer()
peerIdEl.textContent = peer.id

callBtn.addEventListener('click', async () => {
  const calleeId = calleeIdInput.value
  if (!calleeId) return

  callBtn.disabled = true
  callBtn.textContent = 'Starting call...'

  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    localVideo.srcObject = localStream

    const call = await peer.call(calleeId, localStream, {
      metadata: { username: 'Caller' }
    })

    callBtn.textContent = 'Call in progress...'

    const remoteStream = await call.stream
    remoteVideo.srcObject = remoteStream

    call.on('close', () => {
      console.log('Call closed')
      callBtn.disabled = false
      callBtn.textContent = 'Start Call'
      localStream.getTracks().forEach(track => track.stop())
      localVideo.srcObject = null
      remoteVideo.srcObject = null
    })

    call.on('error', (error) => {
      alert('Call error: ' + error.message)
      callBtn.disabled = false
      callBtn.textContent = 'Start Call'
    })
  } catch (error) {
    callBtn.disabled = false
    callBtn.textContent = 'Start Call'
    alert('Failed to start call: ' + error.message)
  }
})
