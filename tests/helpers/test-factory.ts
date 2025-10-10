type PeerFactoryOptions = {
  name: string
  config: any
  createFn: (options?: any) => Promise<any>
  peers?: any[]
}

export function createTestFactory(options: PeerFactoryOptions) {
  const { name, config, createFn, peers } = options

  return {
    name,
    create: async (id: string) => {
      const peer = await createFn({ ...config, id })
      peers?.push(peer)
      return peer
    },
    createWithOptions: async (opts?: any) => {
      const peer = await createFn({ ...config, ...opts })
      peers?.push(peer)
      return peer
    },
  }
}
