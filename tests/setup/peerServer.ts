import { spawn, execSync } from 'child_process'
import type { ChildProcess } from 'child_process'

let serverProcess: ChildProcess | null = null

function tryKillPort(port: number): void {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { timeout: 3000, encoding: 'utf8' })
    for (const line of result.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts[4]) {
        try { process.kill(parseInt(parts[4]), 'SIGKILL') } catch {}
      }
    }
  } catch {
    // Port is free, nothing to kill
  }
}

export async function startPeerServer(port: number = 9000): Promise<number> {
  if (serverProcess) {
    return port
  }

  // Kill any lingering process on the port before starting
  tryKillPort(port)

  return new Promise((resolve, reject) => {
    serverProcess = spawn('bun', ['x', 'peerjs', '--port', port.toString()], {
      stdio: 'pipe',
    })

    const timeout = setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill()
        serverProcess = null
      }
      reject(new Error('PeerServer failed to start'))
    }, 5000)

    serverProcess.stdout?.on('data', data => {
      if (
        data.toString().includes('Started PeerServer') ||
        data.toString().includes('listening')
      ) {
        clearTimeout(timeout)
        resolve(port)
      }
    })

    serverProcess.stderr?.on('data', data => {
      console.error('PeerServer error:', data.toString())
    })

    serverProcess.on('error', error => {
      clearTimeout(timeout)
      serverProcess = null
      reject(error)
    })

    serverProcess.on('exit', code => {
      if (serverProcess) {
        clearTimeout(timeout)
        serverProcess = null
        reject(new Error(`PeerServer exited with code ${code}`))
      }
    })
  })
}

export async function stopPeerServer(): Promise<void> {
  if (!serverProcess) {
    return
  }

  return new Promise(resolve => {
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
