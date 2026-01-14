# Security

Security is paramount in web applications. This guide covers essential security practices for protecting your Next.js applications from common vulnerabilities and attacks.

---

## Table of Contents

1. [Input Validation](#input-validation)
2. [Authentication Patterns](#authentication-patterns)
3. [Authorization](#authorization)
4. [XSS Prevention](#xss-prevention)
5. [CSRF Protection](#csrf-protection)
6. [Data Exposure](#data-exposure)
7. [SQL Injection Prevention](#sql-injection-prevention)
8. [Dependency Security](#dependency-security)

---

## Input Validation

**Never trust user input.** Always validate and sanitize data on the server, regardless of client-side validation.

### Server-Side Validation with Zod

```typescript
// lib/schemas/user.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),

  email: z.string().email("Invalid email address").toLowerCase().trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),

  age: z
    .number()
    .int("Age must be a whole number")
    .min(13, "Must be at least 13 years old")
    .max(120, "Invalid age"),

  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### Validating API Requests

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createUserSchema } from "@/lib/schemas/user";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate input
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    throw new ValidationError(fieldErrors);
  }

  // Safe to use result.data
  const user = await createUser(result.data);

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
```

### Validating Server Actions

```typescript
// actions/user.ts
"use server";

import { createUserSchema } from "@/lib/schemas/user";
import { revalidatePath } from "next/cache";

interface ActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Convert FormData to object
  const rawData = Object.fromEntries(formData.entries());

  // Validate
  const result = createUserSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.user.create({ data: result.data });
    revalidatePath("/users");

    return { success: true, message: "User created successfully" };
  } catch (error) {
    // Never expose internal error details
    return {
      success: false,
      errors: { _form: ["An unexpected error occurred"] },
    };
  }
}
```

### Sanitization

```typescript
// lib/utils/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

// Sanitize HTML content (when you must accept HTML)
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255);
}

// Sanitize for logging (remove sensitive data)
export function sanitizeForLog<T extends object>(
  obj: T,
  sensitiveKeys = ["password", "token", "secret", "apiKey"]
): T {
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      (result as Record<string, unknown>)[key] = "[REDACTED]";
    }
  }

  return result;
}
```

---

## Authentication Patterns

### Session Management

```typescript
// lib/auth/session.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.SESSION_SECRET!);
const ALGORITHM = "HS256";

export interface SessionPayload {
  userId: string;
  role: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  role: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(SECRET_KEY);

  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get("session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: [ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      role: payload.role as string,
      expiresAt: new Date(payload.exp! * 1000),
    };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  cookies().delete("session");
}
```

### Password Hashing

```typescript
// lib/auth/password.ts
import { hash, compare } from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// Usage in signup
export async function signup(email: string, password: string) {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}

// Usage in login
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Use same error for both cases to prevent user enumeration
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await createSession(user.id, user.role);

  return user;
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number; // in milliseconds
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (limit: number, token: string): Promise<void> => {
      const now = Date.now();
      const tokenCount = tokenCache.get(token) || [];

      // Remove old timestamps
      const validTimestamps = tokenCount.filter(
        (timestamp) => now - timestamp < options.interval
      );

      if (validTimestamps.length >= limit) {
        return Promise.reject(
          new RateLimitExceededError(Math.ceil(options.interval / 1000))
        );
      }

      validTimestamps.push(now);
      tokenCache.set(token, validTimestamps);

      return Promise.resolve();
    },
  };
}

// Usage in API route
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  const ip = request.ip || "anonymous";

  await limiter.check(10, ip); // 10 requests per minute per IP

  // Handle request
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
// lib/auth/permissions.ts
export type Role = "admin" | "editor" | "user" | "guest";
export type Permission =
  | "users:read"
  | "users:write"
  | "users:delete"
  | "posts:read"
  | "posts:write"
  | "posts:delete"
  | "admin:access";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "users:read",
    "users:write",
    "users:delete",
    "posts:read",
    "posts:write",
    "posts:delete",
    "admin:access",
  ],
  editor: ["users:read", "posts:read", "posts:write", "posts:delete"],
  user: ["users:read", "posts:read"],
  guest: ["posts:read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}
```

### Proxy Protection (Next.js 16)

Next.js 16 uses `proxy.ts` instead of middleware for route protection. Proxy should only perform optimistic checks using cookies—never make database calls in proxy.

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { cookies } from "next/headers";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];
const ADMIN_PATHS = ["/admin"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Optimistic auth check using session cookie only
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optimistic admin check (verify in DAL for actual security)
  if (ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

> **Important**: Proxy checks are optimistic. Always verify permissions in your Data Access Layer (DAL) and Server Actions for actual security.

````

### API Route Protection

```typescript
// lib/auth/protect.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./session";
import { hasPermission, Permission, Role } from "./permissions";

type Handler = (
  request: NextRequest,
  context?: { params: Record<string, string> },
  session?: { userId: string; role: Role }
) => Promise<NextResponse>;

export function withAuth(handler: Handler, requiredPermission?: Permission) {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string> }
  ) => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }

    if (
      requiredPermission &&
      !hasPermission(session.role as Role, requiredPermission)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        },
        { status: 403 }
      );
    }

    return handler(request, context, {
      userId: session.userId,
      role: session.role as Role,
    });
  };
}

// Usage
export const DELETE = withAuth(async (request, { params }, session) => {
  // Only admins can reach here
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}, "users:delete");
````

---

## XSS Prevention

### React's Built-in Protection

React automatically escapes values embedded in JSX, preventing most XSS attacks.

```typescript
// [Good] Safe: React escapes this automatically
function UserGreeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

// Even with malicious input like "<script>alert('xss')</script>",
// it renders as text, not HTML
```

### Avoid dangerouslySetInnerHTML

```typescript
// [Bad] Dangerous: Can execute malicious scripts
function UnsafeContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// [Good] Safe: Sanitize if you must render HTML
import DOMPurify from "isomorphic-dompurify";

function SafeContent({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

// [Good] Better: Use a markdown renderer
import ReactMarkdown from "react-markdown";

function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      allowedElements={["p", "strong", "em", "a", "ul", "ol", "li"]}
    >
      {markdown}
    </ReactMarkdown>
  );
}
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
```

### URL Validation

```typescript
// [Bad] Dangerous: JavaScript URLs can execute code
function UnsafeLink({ url }: { url: string }) {
  return <Link href={url}>Click here</a>;
}
// If url = "javascript:alert('xss')", clicking executes the script

// [Good] Safe: Validate URLs
function SafeLink({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsed = new URL(urlString);
      return ["http:", "https:", "mailto:"].includes(parsed.protocol);
    } catch {
      // Relative URLs are safe
      return urlString.startsWith("/");
    }
  };

  if (!isValidUrl(url)) {
    return <span>{children}</span>;
  }

  return (
    <Link href={url} rel="noopener noreferrer">
      {children}
    </a>
  );
}
```

---

## CSRF Protection

### Server Actions Protection

Next.js Server Actions have built-in CSRF protection. They automatically verify that:

1. The request originates from your application
2. The request includes a valid action token

```typescript
// Server actions are automatically protected
"use server";

export async function createPost(formData: FormData) {
  // This action can only be called from your application
  const title = formData.get("title");
  // ...
}
```

### API Route Protection

For custom API routes, implement CSRF protection manually.

```typescript
// lib/csrf.ts
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.CSRF_SECRET!);

export async function generateCsrfToken(): Promise<string> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(SECRET_KEY);

  cookies().set("csrf-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600,
  });

  return token;
}

export async function verifyCsrfToken(): Promise<boolean> {
  const cookieToken = cookies().get("csrf-token")?.value;
  const headerToken = headers().get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return false;
  }

  try {
    await jwtVerify(cookieToken, SECRET_KEY);
    return true;
  } catch {
    return false;
  }
}

// Usage in API route
export async function POST(request: NextRequest) {
  if (!(await verifyCsrfToken())) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // Process request
}
```

### SameSite Cookies

```typescript
// Always use SameSite cookies
cookies().set("session", token, {
  httpOnly: true, // Prevent JavaScript access
  secure: true, // HTTPS only
  sameSite: "strict", // Prevent CSRF
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
});
```

---

## Data Exposure

### Environment Variables

```typescript
// [Good] Server-only secrets (no NEXT_PUBLIC_ prefix)
// .env
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key
API_SECRET_KEY=secret-api-key

// [Good] Client-safe variables
NEXT_PUBLIC_API_URL=https://api.example.com

// lib/env.ts - Type-safe environment variables
import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_SECRET_KEY: z.string(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

// Validate server env (only on server)
export const serverEnv = serverSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  API_SECRET_KEY: process.env.API_SECRET_KEY,
});

// Validate client env
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
```

### API Response Filtering

```typescript
// [Good] Only return necessary data
function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    // Don't include: email, password, internalNotes, etc.
  };
}

export async function GET(request: NextRequest) {
  const users = await prisma.user.findMany();

  // Filter sensitive data before sending
  const publicUsers = users.map(toPublicUser);

  return NextResponse.json({ data: publicUsers });
}

// [Good] Use Prisma select to fetch only needed fields
export async function GET(request: NextRequest) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      avatar: true,
      // Only select public fields
    },
  });

  return NextResponse.json({ data: users });
}
```

### Hiding Implementation Details

```typescript
// [Bad] Exposes internal error details
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// [Good] Generic error message in production
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error) {
    console.error("Internal error:", error); // Log for debugging

    return NextResponse.json(
      {
        error: {
          message: "An unexpected error occurred",
          // Only include details in development
          ...(process.env.NODE_ENV === "development" && {
            details: error instanceof Error ? error.message : String(error),
          }),
        },
      },
      { status: 500 }
    );
  }
}
```

---

## SQL Injection Prevention

### Use Prisma (Parameterized Queries)

Prisma automatically uses parameterized queries, preventing SQL injection.

```typescript
// [Good] Safe: Prisma parameterizes automatically
const users = await prisma.user.findMany({
  where: {
    email: userInput, // Even if userInput is malicious, it's escaped
  },
});

// [Good] Safe: Prisma raw queries with parameters
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### Avoid String Concatenation

```typescript
// [Bad] Dangerous: SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
await prisma.$queryRawUnsafe(query);

// [Good] Safe: Use parameterized queries
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### Input Validation for Database Queries

```typescript
// lib/schemas/query.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Usage
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params = paginationSchema.parse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    sortBy: searchParams.get("sortBy"),
    sortOrder: searchParams.get("sortOrder"),
  });

  const users = await prisma.user.findMany({
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    orderBy: { [params.sortBy]: params.sortOrder },
  });

  return NextResponse.json({ data: users });
}
```

---

## Dependency Security

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (when possible)
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

### Lock File Management

```bash
# Always commit lock files
# package-lock.json (npm) or pnpm-lock.yaml (pnpm)

# Use exact versions in CI
npm ci  # Instead of npm install
```

### Automated Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "@types/*"
      development-dependencies:
        patterns:
          - "@types/*"
          - "*eslint*"
          - "*prettier*"
          - "*jest*"
```

### CI Security Checks

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * *" # Daily

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Check for known vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Security Checklist

### Before Deployment

- [ ] All user inputs validated server-side
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] Sessions use httpOnly, secure, sameSite cookies
- [ ] HTTPS enforced in production
- [ ] Environment variables properly configured
- [ ] No secrets in client-side code
- [ ] API responses filtered for sensitive data
- [ ] Rate limiting implemented
- [ ] CORS configured appropriately
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Error messages don't expose internals

### Regular Maintenance

- [ ] Run `npm audit` weekly
- [ ] Update dependencies monthly
- [ ] Review access logs regularly
- [ ] Rotate secrets periodically
- [ ] Test authentication flows
- [ ] Review third-party integrations

---

## Best Practices Summary

1. **Validate all inputs** — Never trust user data
2. **Use parameterized queries** — Prisma handles this automatically
3. **Hash passwords** — bcrypt with 12+ rounds
4. **Secure sessions** — httpOnly, secure, sameSite cookies
5. **Implement RBAC** — Check permissions on every protected route
6. **Prevent XSS** — Avoid dangerouslySetInnerHTML, sanitize when needed
7. **Set security headers** — CSP, X-Frame-Options, etc.
8. **Protect environment variables** — Never expose secrets
9. **Filter API responses** — Only return necessary data
10. **Keep dependencies updated** — Regular audits and updates

---

_Next: [Accessibility](./09-accessibility.md)_
