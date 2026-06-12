import { dep, hasDep, hasFile, hit, type StackDetector } from './types'

/**
 * The detector registry. Each detector is pure and independent — adding support
 * for a new framework/tool is a new entry here, nothing else changes.
 */
export const detectors: StackDetector[] = [
  // ─── Frontend frameworks ──────────────────────────────────────────────────
  {
    id: 'next',
    detect: (c) =>
      hasDep(c, 'next') || hasFile(c, 'next.config.js', 'next.config.ts', 'next.config.mjs')
        ? [hit('frontend', 'Next.js', { version: dep(c, 'next'), source: 'next' })]
        : [],
  },
  {
    id: 'remix',
    detect: (c) =>
      hasDep(c, '@remix-run/react', '@remix-run/node')
        ? [hit('frontend', 'Remix', { version: dep(c, '@remix-run/react') })]
        : [],
  },
  {
    id: 'nuxt',
    detect: (c) =>
      hasDep(c, 'nuxt') || hasFile(c, 'nuxt.config.ts', 'nuxt.config.js')
        ? [hit('frontend', 'Nuxt', { version: dep(c, 'nuxt') })]
        : [],
  },
  {
    id: 'vue',
    detect: (c) => (hasDep(c, 'vue') ? [hit('frontend', 'Vue', { version: dep(c, 'vue') })] : []),
  },
  {
    id: 'angular',
    detect: (c) =>
      hasDep(c, '@angular/core')
        ? [hit('frontend', 'Angular', { version: dep(c, '@angular/core') })]
        : [],
  },
  {
    id: 'svelte',
    detect: (c) =>
      hasDep(c, 'svelte', '@sveltejs/kit')
        ? [hit('frontend', hasDep(c, '@sveltejs/kit') ? 'SvelteKit' : 'Svelte')]
        : [],
  },
  {
    id: 'astro',
    detect: (c) =>
      hasDep(c, 'astro') || hasFile(c, 'astro.config.mjs', 'astro.config.ts', 'astro.config.js')
        ? [hit('frontend', 'Astro', { version: dep(c, 'astro') })]
        : [],
  },
  {
    id: 'react',
    // Lower confidence: Next/Remix already imply React.
    detect: (c) =>
      hasDep(c, 'react') ? [hit('frontend', 'React', { version: dep(c, 'react'), confidence: 0.9 })] : [],
  },
  {
    id: 'vite',
    detect: (c) =>
      hasDep(c, 'vite') || hasFile(c, 'vite.config.ts', 'vite.config.js')
        ? [hit('build', 'Vite', { version: dep(c, 'vite') })]
        : [],
  },
  {
    id: 'tailwind',
    detect: (c) =>
      hasDep(c, 'tailwindcss') || hasFile(c, 'tailwind.config.js', 'tailwind.config.ts')
        ? [hit('frontend', 'Tailwind CSS', { version: dep(c, 'tailwindcss') })]
        : [],
  },

  // ─── Backend frameworks (node) ────────────────────────────────────────────
  {
    id: 'nestjs',
    detect: (c) =>
      hasDep(c, '@nestjs/core') ? [hit('backend', 'NestJS', { version: dep(c, '@nestjs/core') })] : [],
  },
  {
    id: 'express',
    detect: (c) =>
      hasDep(c, 'express') ? [hit('backend', 'Express', { version: dep(c, 'express') })] : [],
  },
  {
    id: 'fastify',
    detect: (c) =>
      hasDep(c, 'fastify') ? [hit('backend', 'Fastify', { version: dep(c, 'fastify') })] : [],
  },

  // ─── Backend frameworks (other ecosystems) ────────────────────────────────
  {
    id: 'django',
    detect: (c) => (hasFile(c, 'manage.py') ? [hit('backend', 'Django', { confidence: 0.9 })] : []),
  },
  {
    id: 'flask-fastapi',
    detect: (c) => {
      const out = []
      if (c.files.has('requirements.txt') || c.files.has('pyproject.toml')) {
        // Best-effort; deeper parsing in a later phase.
        if (c.files.has('main.py')) out.push(hit('backend', 'FastAPI/Flask', { confidence: 0.4 }))
      }
      return out
    },
  },
  {
    id: 'laravel',
    detect: (c) => (hasFile(c, 'artisan') ? [hit('backend', 'Laravel', { confidence: 0.9 })] : []),
  },
  {
    id: 'rails',
    detect: (c) =>
      hasFile(c, 'config.ru') && c.ecosystems.has('ruby') ? [hit('backend', 'Rails', { confidence: 0.6 })] : [],
  },
  {
    id: 'spring',
    detect: (c) =>
      hasFile(c, 'pom.xml', 'build.gradle') && c.ecosystems.has('java')
        ? [hit('backend', 'Spring Boot', { confidence: 0.5 })]
        : [],
  },
  {
    id: 'flutter',
    detect: (c) =>
      hasFile(c, 'pubspec.yaml') ? [hit('frontend', 'Flutter', { confidence: 0.7 })] : [],
  },

  // ─── Shopify ──────────────────────────────────────────────────────────────
  {
    id: 'shopify',
    detect: (c) => {
      if (hasFile(c, 'shopify.app.toml')) return [hit('backend', 'Shopify App', { confidence: 1 })]
      if (hasFile(c, 'shopify.theme.toml') || hasFile(c, '.theme-check.yml'))
        return [hit('frontend', 'Shopify Theme', { confidence: 0.9 })]
      if (hasDep(c, '@shopify/shopify-app-remix', '@shopify/shopify-api'))
        return [hit('backend', 'Shopify App', { version: dep(c, '@shopify/shopify-api') })]
      return []
    },
  },

  // ─── ORMs / databases ─────────────────────────────────────────────────────
  {
    id: 'prisma',
    detect: (c) =>
      hasDep(c, 'prisma', '@prisma/client') || hasFile(c, 'schema.prisma', 'prisma')
        ? [hit('orm', 'Prisma', { version: dep(c, '@prisma/client') })]
        : [],
  },
  {
    id: 'drizzle',
    detect: (c) =>
      hasDep(c, 'drizzle-orm') ? [hit('orm', 'Drizzle', { version: dep(c, 'drizzle-orm') })] : [],
  },
  {
    id: 'typeorm',
    detect: (c) => (hasDep(c, 'typeorm') ? [hit('orm', 'TypeORM', { version: dep(c, 'typeorm') })] : []),
  },
  {
    id: 'mongoose',
    detect: (c) =>
      hasDep(c, 'mongoose') ? [hit('database', 'MongoDB', { source: 'mongoose' })] : [],
  },

  // ─── Auth / payments / infra ──────────────────────────────────────────────
  {
    id: 'auth',
    detect: (c) => {
      if (hasDep(c, 'next-auth', '@auth/core')) return [hit('auth', 'Auth.js')]
      if (hasDep(c, '@clerk/nextjs', '@clerk/clerk-react')) return [hit('auth', 'Clerk')]
      if (hasDep(c, '@supabase/supabase-js')) return [hit('auth', 'Supabase')]
      return []
    },
  },
  {
    id: 'stripe',
    detect: (c) =>
      hasDep(c, 'stripe', '@stripe/stripe-js') ? [hit('payments', 'Stripe')] : [],
  },
  {
    id: 'docker',
    detect: (c) =>
      hasFile(c, 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml')
        ? [hit('infra', 'Docker')]
        : [],
  },
  {
    id: 'hosting',
    detect: (c) => {
      if (hasFile(c, 'vercel.json')) return [hit('hosting', 'Vercel')]
      if (hasFile(c, 'netlify.toml')) return [hit('hosting', 'Netlify')]
      if (hasFile(c, 'fly.toml')) return [hit('hosting', 'Fly.io')]
      return []
    },
  },
]
