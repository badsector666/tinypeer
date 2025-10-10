#!/usr/bin/env node
import { buildSync } from 'esbuild'
import { gzipSync } from 'zlib'
import { resolve } from 'path'

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

function estimateBundleSize(entryPoint, label) {
  try {
    const result = buildSync({
      entryPoints: [entryPoint],
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      write: false,
      logLevel: 'silent',
    })

    const bundled = result.outputFiles[0].contents
    const gzipped = gzipSync(bundled)

    console.log(`${label}:`)
    console.log(`  Minified: ${formatBytes(bundled.length)}`)
    console.log(`  Gzipped:  ${formatBytes(gzipped.length)}`)
    console.log()
  } catch (error) {
    console.error(`Error bundling ${label}:`, error.message)
  }
}

console.log('\nEstimated Bundle Sizes:\n')
estimateBundleSize(resolve(process.cwd(), 'src/data-peer.ts'), 'data-peer.ts (core)')
estimateBundleSize(resolve(process.cwd(), 'src/peer.ts'), 'peer.ts (core)')
