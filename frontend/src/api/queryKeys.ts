export const queryKeys = {
  health: ['health'] as const,
  journeys: {
    all: ['journeys'] as const,
    mine: (query = '') => ['journeys', 'mine', { query }] as const,
    public: ['journeys', 'public'] as const,
    publicPage: (page: number, query = '') => ['journeys', 'public', { page, query }] as const,
    detail: (id: number) => ['journeys', id] as const,
  },
  events: {
    all: (journeyId: number) => ['journeys', journeyId, 'events'] as const,
    detail: (journeyId: number, eventId: number) =>
      ['journeys', journeyId, 'events', eventId] as const,
  },
} as const
