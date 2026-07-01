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
    sitemap: 'https://interioros.com/sitemap.xml',
  }
}
