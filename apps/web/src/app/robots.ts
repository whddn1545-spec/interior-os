import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/help', '/pricing'],
      disallow: [
        '/api/', 
        '/admin/', 
        '/settings/', 
        '/quotes/*', 
        '/sites/*', 
        '/customers/*',
        '/finance/*',
        '/schedule/*'
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://interior-os.vercel.app'}/sitemap.xml`,
  }
}
