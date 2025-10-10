import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

let serverProcess: ChildProcess | null = null

export async function startPeerServer(port: number = 9000): Promise<number> {
  if (serverProcess) {
    return port
  }

  return new Promise((resolve, reject) => {
    serverProcess = spawn('npx', ['peerjs', '--port', port.toString()], {
      stdio: 'pipe',
    })

    let started = false

    const timeout = setTimeout(() => {
      if (!started) {
        if (serverProcess) {
          serverProcess.kill()
          serverProcess = null
        }
        reject(new Error('PeerServer failed to start'))
      }
    }, 5000)

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Started PeerServer') || output.includes('listening')) {
        if (!started) {
          started = true
          clearTimeout(timeout)
          resolve(port)
        }
      }
    })

    serverProcess.stderr?.on('data', (data) => {
      console.error('PeerServer error:', data.toString())
    })

    serverProcess.on('error', (error) => {
      clearTimeout(timeout)
      serverProcess = null
      reject(error)
    })

    serverProcess.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout)
        serverProcess = null
        reject(new Error(`PeerServer exited with code ${code}`))
      }
    })

    setTimeout(() => {
      if (!started) {
        started = true
        clearTimeout(timeout)
        resolve(port)
      }
    }, 1000)
  })
}

export async function stopPeerServer(): Promise<void> {
  if (!serverProcess) {
    return
  }

  return new Promise((resolve) => {
    const process = serverProcess
    serverProcess = null

    if (process) {
      process.on('exit', () => {
        resolve()
      })

      process.kill('SIGTERM')

      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
        resolve()
      }, 2000)
    } else {
      resolve()
    }
  })
}
