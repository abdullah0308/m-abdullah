import type { GlobalConfig } from 'payload'

export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  label: 'Site Content',
  access: {
    read: () => true,
    update: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'data',
      type: 'json',
      admin: {
        description: 'All website content. Use /admin for inline visual editing.',
      },
    },
  ],
}
