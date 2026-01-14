# API Design

Well-designed APIs are essential for maintainable applications. This guide covers patterns for building robust, consistent, and secure API endpoints in Next.js.

---

## Table of Contents

1. [Route Handler Patterns](#route-handler-patterns)
2. [Request and Response Typing](#request-and-response-typing)
3. [Error Response Format](#error-response-format)
4. [Pagination Patterns](#pagination-patterns)
5. [Rate Limiting](#rate-limiting)
6. [API Versioning](#api-versioning)

---

## Route Handler Patterns

### Basic Route Handler

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createUserSchema } from "@/lib/schemas/user";
import { withErrorHandling } from "@/lib/api/middleware";

// GET /api/users
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: users,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// POST /api/users
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = createUserSchema.parse(body);

  const user = await prisma.user.create({
    data: validated,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
});
```

### Dynamic Route Handler

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { updateUserSchema } from "@/lib/schemas/user";
import { withErrorHandling } from "@/lib/api/middleware";

interface Context {
  params: { id: string };
}

// GET /api/users/:id
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: Context) => {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User", params.id);
    }

    return NextResponse.json({ success: true, data: user });
  }
);

// PUT /api/users/:id
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: Context) => {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: validated,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  }
);

// DELETE /api/users/:id
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: Context) => {
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { success: true, message: "User deleted" },
      { status: 200 }
    );
  }
);
```

### Error Handling Middleware

```typescript
// lib/api/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "@/lib/errors";

type Handler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Zod validation error
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(err.message);
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              fieldErrors,
            },
          },
          { status: 422 }
        );
      }

      // Application error
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.statusCode }
        );
      }

      // Unknown error
      console.error("Unexpected error:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred",
          },
        },
        { status: 500 }
      );
    }
  };
}
```

---

## Request and Response Typing

### Typed Request Handling

```typescript
// lib/api/types.ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    fieldErrors?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

### Response Helpers

```typescript
// lib/api/response.ts
import { NextResponse } from "next/server";
import type { ApiSuccessResponse, PaginationMeta } from "./types";

export function successResponse<T>(
  data: T,
  meta?: PaginationMeta,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(meta && { meta }),
    },
    { status }
  );
}

export function createdResponse<T>(
  data: T
): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, undefined, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
```

### Request Parsing

```typescript
// lib/api/request.ts
import { NextRequest } from "next/server";
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export function parseSearchParams<T extends z.ZodSchema>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}

// Usage
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { page, pageSize } = parseSearchParams(request, paginationSchema);
  // ...
});
```

---

## Error Response Format

### Consistent Error Structure

```typescript
// All errors follow this format
interface ErrorResponse {
  success: false;
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message
    details?: object; // Additional context
    fieldErrors?: object; // Field-level validation errors
  };
  timestamp: string; // ISO timestamp
  requestId?: string; // For debugging
}
```

### Error Examples

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request parameters"
  }
}

// 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id \"abc123\" not found",
    "details": {
      "resource": "User",
      "identifier": "abc123"
    }
  }
}

// 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  }
}

// 422 Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fieldErrors": {
      "email": ["Invalid email format"],
      "password": [
        "Password must be at least 8 characters",
        "Password must contain a number"
      ]
    }
  }
}

// 429 Rate Limit
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 60
    }
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Pagination Patterns

### Offset-Based Pagination

```typescript
// app/api/products/route.ts
interface ProductsQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const query = parseSearchParams(
    request,
    z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      category: z.string().optional(),
      search: z.string().optional(),
    })
  );

  const where = {
    ...(query.category && { categoryId: query.category }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: products,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
      hasNext: query.page * query.pageSize < total,
      hasPrev: query.page > 1,
    },
  });
});
```

### Cursor-Based Pagination

```typescript
// For infinite scroll / large datasets
interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const query = parseSearchParams(
    request,
    z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
  );

  const products = await prisma.product.findMany({
    take: query.limit + 1, // Fetch one extra to check for next page
    ...(query.cursor && {
      cursor: { id: query.cursor },
      skip: 1, // Skip the cursor item
    }),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = products.length > query.limit;
  const items = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return NextResponse.json({
    success: true,
    data: items,
    meta: {
      hasMore,
      nextCursor,
    },
  });
});
```

### Pagination Response Type

```typescript
// types/api.ts
export interface OffsetPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPaginationMeta {
  hasMore: boolean;
  nextCursor?: string;
}

export interface PaginatedResponse<T, M = OffsetPaginationMeta> {
  success: true;
  data: T[];
  meta: M;
}
```

---

## Rate Limiting

### In-Memory Rate Limiter

```typescript
// lib/rate-limit.ts
import { LRUCache } from "lru-cache";

interface RateLimitConfig {
  interval: number; // Time window in ms
  limit: number; // Max requests per window
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  const cache = new LRUCache<string, number[]>({
    max: 500,
    ttl: config.interval,
  });

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const timestamps = cache.get(key) || [];

      // Filter timestamps within window
      const validTimestamps = timestamps.filter(
        (ts) => now - ts < config.interval
      );

      if (validTimestamps.length >= config.limit) {
        return {
          success: false,
          remaining: 0,
          reset: Math.ceil((validTimestamps[0] + config.interval - now) / 1000),
        };
      }

      validTimestamps.push(now);
      cache.set(key, validTimestamps);

      return {
        success: true,
        remaining: config.limit - validTimestamps.length,
        reset: Math.ceil(config.interval / 1000),
      };
    },
  };
}

// Usage
const apiLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  limit: 60, // 60 requests per minute
});

const strictLimiter = createRateLimiter({
  interval: 60 * 1000,
  limit: 10, // For sensitive endpoints
});
```

### Rate Limit Middleware

```typescript
// lib/api/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({
  interval: 60 * 1000,
  limit: 60,
});

export function withRateLimit(handler: Handler): Handler {
  return async (request, context) => {
    const ip =
      request.ip || request.headers.get("x-forwarded-for") || "anonymous";
    const result = limiter.check(ip);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests",
            details: { retryAfter: result.reset },
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": result.reset.toString(),
          },
        }
      );
    }

    const response = await handler(request, context);
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.reset.toString());

    return response;
  };
}

// Compose middlewares
export function withApiMiddleware(handler: Handler): Handler {
  return withRateLimit(withErrorHandling(handler));
}
```

---

## API Versioning

### URL-Based Versioning

```
app/api/
├── v1/
│   ├── users/
│   │   └── route.ts        # /api/v1/users
│   └── products/
│       └── route.ts        # /api/v1/products
└── v2/
    ├── users/
    │   └── route.ts        # /api/v2/users
    └── products/
        └── route.ts        # /api/v2/products
```

### Header-Based Versioning

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const version = request.headers.get("X-API-Version") || "v1";

    // Rewrite to versioned path
    const url = request.nextUrl.clone();
    url.pathname = `/api/${version}${url.pathname.replace("/api", "")}`;

    return NextResponse.rewrite(url);
  }
}
```

### Version Deprecation

```typescript
// lib/api/middleware.ts
export function withVersionCheck(
  handler: Handler,
  deprecatedVersions: string[] = []
): Handler {
  return async (request, context) => {
    const version = request.headers.get("X-API-Version") || "v1";

    const response = await handler(request, context);

    if (deprecatedVersions.includes(version)) {
      response.headers.set(
        "X-API-Deprecated",
        "This API version is deprecated and will be removed on 2025-01-01"
      );
      response.headers.set("X-API-Sunset", "2025-01-01");
    }

    return response;
  };
}
```

---

## API Client

### Type-Safe API Client

```typescript
// lib/api/client.ts
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { User, CreateUserInput, UpdateUserInput } from "@/types/user";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error.message, data.error.code, response.status);
  }

  return data;
}

export const api = {
  users: {
    list: (params?: { page?: number; pageSize?: number }) =>
      request<PaginatedResponse<User>>(
        `/api/users?${new URLSearchParams(params as Record<string, string>)}`
      ),

    get: (id: string) => request<ApiResponse<User>>(`/api/users/${id}`),

    create: (data: CreateUserInput) =>
      request<ApiResponse<User>>("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateUserInput) =>
      request<ApiResponse<User>>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<ApiResponse<void>>(`/api/users/${id}`, {
        method: "DELETE",
      }),
  },

  products: {
    // Similar structure for products
  },
};

// Usage
const users = await api.users.list({ page: 1, pageSize: 20 });
const user = await api.users.get("123");
```

---

## Best Practices Summary

1. **Consistent response format** — Always return `{success, data/error}`
2. **Type everything** — Request params, bodies, and responses
3. **Centralized error handling** — Use middleware for DRY code
4. **Validate all inputs** — Zod schemas for type-safe validation
5. **Proper status codes** — 201 for create, 204 for delete, etc.
6. **Pagination metadata** — Include total, page, hasNext
7. **Rate limiting** — Protect against abuse
8. **Version your APIs** — Plan for breaking changes
9. **Document endpoints** — Keep API docs up to date
10. **Type-safe clients** — Generate from schemas if possible

---

_Next: [Components](./14-components.md)_
