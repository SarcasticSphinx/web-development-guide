# Environment

Proper environment configuration is essential for security and maintainability. This guide covers patterns for managing environment variables, configuration, and feature flags in Next.js applications.

---

## Table of Contents

1. [Environment Variable Patterns](#environment-variable-patterns)
2. [Runtime vs Build-Time Config](#runtime-vs-build-time-config)
3. [Next.js Env File Hierarchy](#nextjs-env-file-hierarchy)
4. [Type-Safe Environment Variables](#type-safe-environment-variables)
5. [Secrets Management](#secrets-management)
6. [Feature Flags](#feature-flags)

---

## Environment Variable Patterns

### Naming Conventions

```bash
# .env.example - Template for required variables

# Public variables (exposed to client)
# Prefix with NEXT_PUBLIC_
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Private variables (server-only)
# No NEXT_PUBLIC_ prefix
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_live_...
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx

# Feature flags
FEATURE_NEW_CHECKOUT=true
FEATURE_BETA_FEATURES=false

# Environment indicator
NODE_ENV=development
```

### Variable Categories

| Category        | Prefix           | Access                           |
| --------------- | ---------------- | -------------------------------- |
| Public config   | `NEXT_PUBLIC_`   | Client + Server                  |
| Private secrets | None             | Server only                      |
| Feature flags   | `FEATURE_`       | Server only (expose selectively) |
| Service URLs    | Descriptive name | Depends on use                   |

---

## Runtime vs Build-Time Config

### Build-Time Variables

Inlined at build time, cannot change without rebuild.

```typescript
// These become static values in the bundle
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// [Warning] If you need to change these, you must rebuild
```

### Runtime Variables

Available at request time, can change without rebuild.

```typescript
// next.config.js
module.exports = {
  // Expose runtime env vars
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL,
  },
  serverRuntimeConfig: {
    dbUrl: process.env.DATABASE_URL,
  },
};

// Usage (client-side)
import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();
const apiUrl = publicRuntimeConfig.apiUrl;

// Usage (server-side)
const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();
```

### Dynamic Server vs Static

```typescript
// This page is statically generated, env checked at build
export default function StaticPage() {
  // [Warning] This is the build-time value
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return <div>API: {apiUrl}</div>;
}

// Force dynamic to use runtime values
export const dynamic = "force-dynamic";

export default function DynamicPage() {
  // [Good] This is checked at request time
  const secret = process.env.API_SECRET;
  return <div>Secret available at runtime</div>;
}
```

---

## Next.js Env File Hierarchy

Next.js loads environment files in this order (later files override earlier):

```
.env                  # Default for all environments
.env.local           # Local overrides (gitignored)
.env.development     # Development only
.env.development.local # Local dev overrides (gitignored)
.env.production      # Production only
.env.production.local  # Local prod overrides (gitignored)
.env.test            # Test environment
```

### Standard Setup

```bash
# .env - Shared defaults (check into git)
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_DEFAULT_LOCALE=en

# .env.local - Secrets (gitignored)
DATABASE_URL=postgresql://...
JWT_SECRET=...

# .env.development - Dev-specific (check into git)
NEXT_PUBLIC_API_URL=http://localhost:3001
LOG_LEVEL=debug

# .env.production - Prod-specific (check into git)
NEXT_PUBLIC_API_URL=https://api.example.com
LOG_LEVEL=error
```

### .gitignore

```bash
# .gitignore
.env.local
.env.development.local
.env.production.local
.env.test.local

# Never commit these
.env*.local
```

---

## Type-Safe Environment Variables

### Zod Schema Validation

```typescript
// lib/env.ts
import { z } from "zod";

// Server-side variables
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
});

// Client-side variables (must be NEXT_PUBLIC_)
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
});

// For feature flags
const featureSchema = z.object({
  FEATURE_NEW_CHECKOUT: z.coerce.boolean().default(false),
  FEATURE_BETA_FEATURES: z.coerce.boolean().default(false),
});

// Process and validate environment variables
function validateEnv() {
  const serverEnv = serverSchema.safeParse(process.env);
  const clientEnv = clientSchema.safeParse(process.env);
  const featureEnv = featureSchema.safeParse(process.env);

  if (!serverEnv.success && typeof window === "undefined") {
    console.error("[Bad] Invalid server environment variables:");
    console.error(serverEnv.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  if (!clientEnv.success) {
    console.error("[Bad] Invalid client environment variables:");
    console.error(clientEnv.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return {
    server: serverEnv.data!,
    client: clientEnv.data!,
    features: featureEnv.data!,
  };
}

const env = validateEnv();

// Export typed environment variables
export const serverEnv = env.server;
export const clientEnv = env.client;
export const features = env.features;
```

### Usage

```typescript
// Server-side
import { serverEnv } from "@/lib/env";

const db = new PrismaClient({
  datasources: {
    db: { url: serverEnv.DATABASE_URL },
  },
});

// Client-side (in a client component)
import { clientEnv } from "@/lib/env";

fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/users`);
```

### T3 Env Pattern

```typescript
// env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});

// Usage - Type-safe with autocomplete
import { env } from "./env.mjs";

env.DATABASE_URL; // string
env.NEXT_PUBLIC_API_URL; // string
```

---

## Secrets Management

### Vercel Environment Variables

```bash
# Set production secret
vercel env add JWT_SECRET production

# Set for all environments
vercel env add DATABASE_URL production preview development

# Pull to local
vercel env pull .env.local
```

### Docker Secrets

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env.production

# Or use Docker secrets
services:
  app:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_URL_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Secrets Best Practices

```typescript
// [Bad] Logging secrets
console.log("Database URL:", process.env.DATABASE_URL);

// [Good] Mask secrets in logs
console.log("Database connected:", !!process.env.DATABASE_URL);

// [Bad] Exposing secrets in error messages
throw new Error(`Failed to connect to ${process.env.DATABASE_URL}`);

// [Good] Generic error messages
throw new Error("Database connection failed");

// [Good] Sanitize for logging
function sanitizeForLog(obj: Record<string, unknown>) {
  const sensitiveKeys = ["password", "secret", "token", "key"];
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      sensitiveKeys.some((k) => key.toLowerCase().includes(k))
        ? "[REDACTED]"
        : value,
    ])
  );
}
```

---

## Feature Flags

### Simple Feature Flags

```typescript
// lib/features.ts
import { z } from "zod";

const featureSchema = z.object({
  NEW_CHECKOUT: z.coerce.boolean().default(false),
  BETA_FEATURES: z.coerce.boolean().default(false),
  DARK_MODE: z.coerce.boolean().default(true),
  AI_ASSISTANT: z.coerce.boolean().default(false),
});

type FeatureFlags = z.infer<typeof featureSchema>;

export const features: FeatureFlags = featureSchema.parse({
  NEW_CHECKOUT: process.env.FEATURE_NEW_CHECKOUT,
  BETA_FEATURES: process.env.FEATURE_BETA_FEATURES,
  DARK_MODE: process.env.FEATURE_DARK_MODE,
  AI_ASSISTANT: process.env.FEATURE_AI_ASSISTANT,
});

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return features[feature];
}
```

### Usage in Components

```typescript
// Server Component
import { isFeatureEnabled } from "@/lib/features";

export default function CheckoutPage() {
  if (isFeatureEnabled("NEW_CHECKOUT")) {
    return <NewCheckout />;
  }
  return <LegacyCheckout />;
}

// Client Component with context
("use client");

import { createContext, useContext } from "react";
import type { FeatureFlags } from "@/lib/features";

const FeatureFlagContext = createContext<FeatureFlags | null>(null);

export function FeatureFlagProvider({
  features,
  children,
}: {
  features: FeatureFlags;
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagContext.Provider value={features}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const features = useContext(FeatureFlagContext);
  if (!features) {
    throw new Error("useFeatureFlag must be used within FeatureFlagProvider");
  }
  return features[flag];
}

// Usage
function Component() {
  const showBeta = useFeatureFlag("BETA_FEATURES");

  return showBeta ? <BetaFeature /> : null;
}
```

### Percentage Rollouts

```typescript
// lib/features.ts
import { headers } from "next/headers";
import crypto from "crypto";

interface RolloutConfig {
  percentage: number;
  enabledForUsers?: string[];
}

const rollouts: Record<string, RolloutConfig> = {
  NEW_CHECKOUT: { percentage: 25 },
  AI_ASSISTANT: {
    percentage: 10,
    enabledForUsers: ["user_123", "user_456"], // Beta testers
  },
};

export function isRolloutEnabled(feature: string, userId?: string): boolean {
  const config = rollouts[feature];
  if (!config) return false;

  // Check if user is in enabled list
  if (userId && config.enabledForUsers?.includes(userId)) {
    return true;
  }

  // Percentage rollout based on user/session ID
  const identifier = userId || headers().get("x-session-id") || "anonymous";
  const hash = crypto
    .createHash("md5")
    .update(`${feature}-${identifier}`)
    .digest("hex");
  const hashInt = parseInt(hash.slice(0, 8), 16);
  const percentage = (hashInt / 0xffffffff) * 100;

  return percentage < config.percentage;
}
```

### Feature Flag Service Integration

```typescript
// For more advanced needs, integrate with services like:
// - LaunchDarkly
// - Unleash
// - Split.io
// - Flagsmith

// lib/feature-flags.ts
import { LaunchDarkly } from "launchdarkly-node-server-sdk";

const client = new LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!);

export async function getFeatureFlags(userId: string) {
  const user = { key: userId };

  return {
    newCheckout: await client.variation("new-checkout", user, false),
    betaFeatures: await client.variation("beta-features", user, false),
  };
}
```

---

## Configuration Objects

### App Configuration

```typescript
// lib/config.ts
import { clientEnv, serverEnv, features } from "./env";

export const config = {
  app: {
    name: "MyApp",
    url: clientEnv.NEXT_PUBLIC_SITE_URL,
    apiUrl: clientEnv.NEXT_PUBLIC_API_URL,
  },

  auth: {
    sessionDuration: 7 * 24 * 60 * 60, // 7 days in seconds
    jwtSecret: serverEnv.JWT_SECRET,
  },

  email: {
    from: "noreply@example.com",
    replyTo: "support@example.com",
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  },

  features,
} as const;

// Usage
import { config } from "@/lib/config";

const pageSize = config.pagination.defaultPageSize;
```

---

## Best Practices Summary

1. **Validate all env vars** — Fail fast with clear errors
2. **Type your environment** — Zod schemas for safety
3. **Never commit secrets** — Use .env.local, gitignore properly
4. **Separate client/server** — NEXT*PUBLIC* prefix awareness
5. **Use .env.example** — Document required variables
6. **Feature flags for rollouts** — Safe releases
7. **Centralize config** — Single source of truth
8. **Sanitize for logs** — Never log secrets
9. **Environment-specific files** — .env.development, .env.production
10. **Validate at startup** — Catch missing vars early

---

_Next: [Deployment](./17-deployment.md)_
