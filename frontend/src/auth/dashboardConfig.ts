export type UserRole = 'TRAVELLER' | 'EDITOR' | 'ADMIN'

export type DashboardAction = {
  to: string
  label: string
  description: string
  emphasis?: 'primary' | 'default'
}

export type DashboardConfig = {
  eyebrow: string
  title: string
  blurb: string
  actions: DashboardAction[]
  showSystemHealth?: boolean
}

const travellerDashboard: DashboardConfig = {
  eyebrow: 'Traveller',
  title: 'Your dashboard',
  blurb: 'Jump back into your journal, start a new trip, or browse what others have shared.',
  actions: [
    {
      to: '/journeys',
      label: 'My journeys',
      description: 'Open your trips, timelines, and photos.',
      emphasis: 'primary',
    },
    {
      to: '/journeys/new',
      label: 'New journey',
      description: 'Begin a fresh trip entry with title and dates.',
    },
    {
      to: '/explore',
      label: 'Explore',
      description: 'Browse public journeys from the community.',
    },
  ],
}

const editorDashboard: DashboardConfig = {
  eyebrow: 'Editor',
  title: 'Editorial desk',
  blurb: 'Review shared stories first, then keep your own journeys in shape.',
  actions: [
    {
      to: '/explore',
      label: 'Review Explore',
      description: 'Scan the latest public journeys and their timelines.',
      emphasis: 'primary',
    },
    {
      to: '/journeys',
      label: 'My journeys',
      description: 'Edit and organise trips under your account.',
    },
    {
      to: '/journeys/new',
      label: 'New journey',
      description: 'Draft another journey for your own journal.',
    },
  ],
}

const adminDashboard: DashboardConfig = {
  eyebrow: 'Admin',
  title: 'Operations overview',
  blurb: 'Quick access to community content, your own journal, and service health.',
  showSystemHealth: true,
  actions: [
    {
      to: '/explore',
      label: 'Monitor Explore',
      description: 'Check public journeys visible to the community.',
      emphasis: 'primary',
    },
    {
      to: '/journeys',
      label: 'My journeys',
      description: 'Manage journeys on this admin account.',
    },
    {
      to: '/journeys/new',
      label: 'New journey',
      description: 'Create a trip entry when you need a test journal.',
    },
  ],
}

export function normalizeUserRole(role: string | undefined | null): UserRole {
  if (role === 'EDITOR' || role === 'ADMIN' || role === 'TRAVELLER') {
    return role
  }
  return 'TRAVELLER'
}

export function getDashboardConfig(role: string | undefined | null): DashboardConfig {
  switch (normalizeUserRole(role)) {
    case 'ADMIN':
      return adminDashboard
    case 'EDITOR':
      return editorDashboard
    case 'TRAVELLER':
      return travellerDashboard
  }
}
