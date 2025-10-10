import { defineConfig } from 'vitest/config'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isCI = process.env.CI === 'true';

export default defineConfig({
  test: {
    watch: !isCI,
    coverage: {
      include: ['src/**'],
    },
    projects: [
      {
        test: {
          include: [
            'tests/*.unit.test.ts',
          ],
          name: 'unit',
          environment: 'node',
        },
      },
      {
          plugins: [
            basicSsl({
            }),
          ],
        test: {
          include: [
            'tests/*.integration.test.ts',
          ],
          name: 'integration',
          environment: 'node',
          browser: {
            provider: 'playwright',
            enabled: true,
            headless: isCI,
            screenshotFailures: false,
            api: {
              host: '127.0.0.1',
            },
            instances: [
              {
                browser: 'chromium',
                // @ts-expect-error Vitest types have a bug
                launch: {
                  args: [
                    '--use-fake-ui-for-media-stream',
                    '--use-fake-device-for-media-stream',
                  ]
                }
              },
              {
                browser: 'firefox',
                // @ts-expect-error Vitest types have a bug
                launch: {
                  firefoxUserPrefs: {
                    'media.navigator.permission.disabled': true,
                    'media.navigator.streams.fake': true,
                  },
                }
              }
            ],
          },
          globalSetup: './tests/setup/globalSetup.ts',
        },
      },
    ],
  },
})
