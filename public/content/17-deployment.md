# Deployment

This guide covers deployment strategies, CI/CD pipelines, and production-ready configurations for Next.js applications.

---

## Table of Contents

1. [Vercel Deployment](#vercel-deployment)
2. [Docker Deployment](#docker-deployment)
3. [CI/CD Pipelines](#cicd-pipelines)
4. [Build Optimization](#build-optimization)
5. [Preview Environments](#preview-environments)
6. [Monitoring and Logging](#monitoring-and-logging)

---

## Vercel Deployment

### Quick Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### vercel.json Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "regions": ["iad1", "sfo1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health"
    }
  ],
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

### Environment Variables on Vercel

```bash
# Add environment variable
vercel env add DATABASE_URL production

# Pull env vars to local
vercel env pull .env.local

# List all env vars
vercel env ls
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### next.config.js for Standalone

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Optimize for Docker
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

module.exports = nextConfig;
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}

      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/

  deploy:
    runs-on: ubuntu-latest
    needs: [build, e2e]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        uses: metcalfc/changelog-generator@v4
        with:
          myToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Build Optimization

### next.config.js Production Settings

```javascript
// next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker
  output: "standalone",

  // Strict mode for development
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Compression
  compress: true,

  // Source maps in production (for error tracking)
  productionBrowserSourceMaps: true,

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["@heroicons/react", "lodash"],
  },

  // Webpack customization
  webpack: (config, { isServer }) => {
    // Custom webpack config
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

### Build Scripts

```json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "build:docker": "docker build -t myapp .",
    "postbuild": "next-sitemap"
  }
}
```

### Caching Headers

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|avif|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};
```

---

## Preview Environments

### Vercel Preview Deployments

Automatic for every pull request. Configure in `vercel.json`:

```json
{
  "github": {
    "silent": true
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "@preview_api_url"
    }
  }
}
```

### Database Branching (Neon, PlanetScale)

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create database branch
        id: db-branch
        run: |
          # Using Neon CLI
          neonctl branches create \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --name pr-${{ github.event.pull_request.number }}

      - name: Deploy preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        env:
          DATABASE_URL: ${{ steps.db-branch.outputs.connection_string }}
```

---

## Monitoring and Logging

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {} as Record<string, { status: string; latency?: number }>,
  };

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = {
      status: "ok",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.status = "degraded";
    checks.checks.database = { status: "error" };
  }

  // Add more checks as needed (Redis, external APIs, etc.)

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 503,
  });
}
```

### Error Tracking (Sentry)

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### Structured Logging

```typescript
// lib/logger.ts
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});

export { logger };

// Usage
import { logger } from "@/lib/logger";

logger.info({ userId, action: "login" }, "User logged in");
logger.error({ error, requestId }, "Request failed");
```

### Performance Monitoring

```typescript
// lib/web-vitals.ts
import { onCLS, onFID, onLCP, onTTFB, onINP } from "web-vitals";

export function reportWebVitals() {
  onCLS((metric) => sendToAnalytics("CLS", metric));
  onFID((metric) => sendToAnalytics("FID", metric));
  onLCP((metric) => sendToAnalytics("LCP", metric));
  onTTFB((metric) => sendToAnalytics("TTFB", metric));
  onINP((metric) => sendToAnalytics("INP", metric));
}

function sendToAnalytics(name: string, metric: any) {
  // Send to your analytics service
  fetch("/api/analytics/vitals", {
    method: "POST",
    body: JSON.stringify({ name, ...metric }),
    headers: { "Content-Type": "application/json" },
  });
}
```

---

## Pre-Deployment Checklist

```markdown
## Before Deploying

### Build & Tests

- [ ] `npm run build` succeeds without errors
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes

### Environment

- [ ] All required env vars are set in production
- [ ] Secrets are not exposed in client code
- [ ] NEXT*PUBLIC* vars are correct for production

### Security

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Auth flows tested
- [ ] Rate limiting enabled

### Performance

- [ ] Bundle size is acceptable
- [ ] Images are optimized
- [ ] Caching headers set
- [ ] Core Web Vitals acceptable

### Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] Logging set up
- [ ] Health check endpoint works
- [ ] Alerts configured

### Database

- [ ] Migrations applied
- [ ] Backups configured
- [ ] Connection pooling enabled
```

---

## Best Practices Summary

1. **Use preview environments** — Test every PR in isolation
2. **Automate everything** — CI/CD for builds, tests, deploys
3. **Health checks** — Monitor application health
4. **Structured logging** — JSON logs for production
5. **Error tracking** — Sentry or similar for errors
6. **Performance monitoring** — Web Vitals, Lighthouse
7. **Docker for portability** — Consistent environments
8. **Environment separation** — Different configs per env
9. **Rollback strategy** — Know how to revert quickly
10. **Security headers** — Configure in production

---

_Next: [Review Checklist](./18-review-checklist.md)_
