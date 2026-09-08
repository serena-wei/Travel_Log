export const queryKeys = {
  health: ['health'] as const,
  journeys: {
    all: ['journeys'] as const,
    detail: (id: number) => ['journeys', id] as const,
  },
} as const
