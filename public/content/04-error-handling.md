# Error Handling

Effective error handling is crucial for building robust applications. This guide covers patterns for creating, throwing, catching, and displaying errors in TypeScript/Next.js applications.

---

## Table of Contents

1. [Error Class Hierarchy](#error-class-hierarchy)
2. [Error Contract](#error-contract)
3. [Sync vs Async Error Delivery](#sync-vs-async-error-delivery)
4. [Error Boundaries in React](#error-boundaries-in-react)
5. [API Error Handling](#api-error-handling)
6. [Try-Catch Patterns](#try-catch-patterns)
7. [Validation Errors](#validation-errors)
8. [Logging and Monitoring](#logging-and-monitoring)

---

## Error Class Hierarchy

Create a structured hierarchy of error classes to handle different error scenarios consistently.

### Base Application Error

```typescript
// lib/errors/base.ts
export interface ErrorDetails {
  [key: string]: unknown;
}

export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: ErrorDetails
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}
```

### Specific Error Classes

```typescript
// lib/errors/http.ts
import { AppError, ErrorDetails } from "./base";

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: ErrorDetails) {
    super(message, 400, "BAD_REQUEST", true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED", true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN", true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, { resource, identifier });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", details?: ErrorDetails) {
    super(message, 409, "CONFLICT", true, details);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    super("Validation failed", 422, "VALIDATION_ERROR", true, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, "INTERNAL_SERVER_ERROR", false);
  }
}
```

### Domain-Specific Errors

```typescript
// lib/errors/domain.ts
import { AppError } from "./base";

export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      400,
      "INSUFFICIENT_BALANCE",
      true,
      { required, available }
    );
  }
}

export class OrderAlreadyProcessedError extends AppError {
  constructor(orderId: string) {
    super(
      `Order ${orderId} has already been processed`,
      400,
      "ORDER_ALREADY_PROCESSED",
      true,
      { orderId }
    );
  }
}

export class RateLimitExceededError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED", true, {
      retryAfter,
    });
    this.retryAfter = retryAfter;
  }
}
```

### Barrel Export

```typescript
// lib/errors/index.ts
export * from "./base";
export * from "./http";
export * from "./domain";
```

---

## Error Contract

Define a consistent structure for error responses across your application.

### API Error Response Format

```typescript
// types/api.ts
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    fieldErrors?: Record<string, string[]>;
    stack?: string; // Development only
  };
  timestamp: string;
  requestId?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### Error Response Factory

```typescript
// lib/errors/response.ts
import { NextResponse } from "next/server";
import { AppError } from "./base";

export function createErrorResponse(error: unknown, requestId?: string) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          ...(error instanceof ValidationError && {
            fieldErrors: error.fieldErrors,
          }),
          ...(process.env.NODE_ENV === "development" && {
            stack: error.stack,
          }),
        },
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: error.statusCode }
    );
  }

  // Unknown error - treat as internal server error
  console.error("Unexpected error:", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
          originalMessage:
            error instanceof Error ? error.message : String(error),
        }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 500 }
  );
}
```

---

## Sync vs Async Error Delivery

**Critical Rule**: A function should deliver errors either synchronously (throwing) or asynchronously (returning rejected promise/calling callback), but **never both**.

### Synchronous Errors

Use for validation and immediate checks.

```typescript
// [Good] Synchronous validation
function validateEmail(email: string): void {
  if (!email) {
    throw new ValidationError({ email: ["Email is required"] });
  }
  if (!isValidEmailFormat(email)) {
    throw new ValidationError({ email: ["Invalid email format"] });
  }
}

// Usage
try {
  validateEmail(userInput);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  }
}
```

### Asynchronous Errors

Use for I/O operations and async processes.

```typescript
// [Good] Async function with Promise rejection
async function getUser(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("User", id);
  }

  return user;
}

// Usage
try {
  const user = await getUser(userId);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
  }
}
```

### Anti-Pattern: Mixed Delivery

```typescript
// [Bad] Mixed sync and async error delivery
function processOrder(order: Order): Promise<void> {
  // Synchronous error
  if (!order.items.length) {
    throw new Error("Order must have items"); // Throws sync
  }

  return fetch("/api/orders", {
    /* ... */
  }).then((res) => {
    if (!res.ok) {
      throw new Error("API error"); // Throws async
    }
  });
}

// [Good] Consistent async error delivery
async function processOrder(order: Order): Promise<void> {
  if (!order.items.length) {
    throw new ValidationError({ items: ["Order must have items"] });
  }

  const res = await fetch("/api/orders", {
    /* ... */
  });

  if (!res.ok) {
    throw new BadRequestError("Failed to process order");
  }
}
```

---

## Error Boundaries in React

### Next.js Error Boundary (error.tsx)

```typescript
// app/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to error monitoring service
    logError(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-4 text-gray-600">
          We apologize for the inconvenience. Please try again.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-w-xl overflow-auto rounded bg-gray-100 p-4 text-left text-sm">
            {error.message}
          </pre>
        )}
        <div className="mt-8 flex gap-4 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Global Error Boundary

```typescript
// app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1>Something went wrong!</h1>
            <button onClick={reset}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Custom Error Boundary Component

```typescript
// components/ErrorBoundary.tsx
"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert">
            <h2>Something went wrong</h2>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## API Error Handling

### Route Handler Error Wrapper

```typescript
// lib/api/with-error-handling.ts
import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/errors/response";
import { ZodError } from "zod";
import { ValidationError } from "@/lib/errors";

type Handler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (request, context) => {
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(request, context);
      response.headers.set("X-Request-ID", requestId);
      return response;
    } catch (error) {
      // Transform Zod errors to ValidationError
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(err.message);
        });
        return createErrorResponse(new ValidationError(fieldErrors), requestId);
      }

      return createErrorResponse(error, requestId);
    }
  };
}
```

### Using the Error Wrapper

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { createUserSchema } from "@/lib/schemas/user";
import { NotFoundError, ConflictError } from "@/lib/errors";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const validated = createUserSchema.parse(body);

  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existing) {
    throw new ConflictError("User with this email already exists");
  }

  const user = await prisma.user.create({
    data: validated,
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError("User", id);
    }

    return NextResponse.json({ success: true, data: user });
  }

  const users = await prisma.user.findMany();
  return NextResponse.json({ success: true, data: users });
});
```

---

## Try-Catch Patterns

### When to Catch vs Let Bubble

```typescript
// [Good] Catch when you can handle or add context
async function getUserOrders(userId: string) {
  try {
    const orders = await fetchOrders(userId);
    return orders;
  } catch (error) {
    // Add context and rethrow
    throw new AppError(
      `Failed to fetch orders for user ${userId}`,
      500,
      "ORDER_FETCH_FAILED",
      true,
      {
        userId,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

// [Good] Let bubble when you can't handle
async function processPayment(orderId: string) {
  const order = await getOrder(orderId); // Let NotFoundError bubble
  const payment = await chargeCard(order); // Let PaymentError bubble
  await updateOrderStatus(orderId, "paid"); // Let any error bubble
  return payment;
}

// [Good] Catch at the boundary
export const POST = withErrorHandling(async (request: NextRequest) => {
  // All errors handled by wrapper
  const body = await request.json();
  const result = await processPayment(body.orderId);
  return NextResponse.json({ success: true, data: result });
});
```

### Error Wrapping

```typescript
// [Good] Wrap lower-level errors with context
async function sendEmail(to: string, subject: string, body: string) {
  try {
    await emailProvider.send({ to, subject, body });
  } catch (error) {
    throw new AppError("Failed to send email", 500, "EMAIL_SEND_FAILED", true, {
      to,
      subject,
      provider: "sendgrid",
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
```

### Generic Try-Catch Utility

```typescript
// lib/utils/try-catch.ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as E };
  }
}

// Usage
const result = await tryCatch(getUser(userId));

if (!result.success) {
  console.error("Failed to get user:", result.error);
  return null;
}

return result.data;
```

---

## Validation Errors

### Zod Integration

```typescript
// lib/schemas/user.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["admin", "user"]).default("user"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### Form Validation with Server Actions

```typescript
// actions/user.ts
"use server";

import { createUserSchema } from "@/lib/schemas/user";

interface ActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  };

  const result = createUserSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.user.create({ data: result.data });

    return {
      success: true,
      message: "User created successfully",
    };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return {
        success: false,
        errors: { email: ["This email is already registered"] },
      };
    }

    throw error; // Let unexpected errors bubble to error boundary
  }
}
```

### Client-Side Error Display

```typescript
// components/forms/CreateUserForm.tsx
"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/user";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, {
    success: false,
  });

  return (
    <form action={action}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && (
          <p id="name-error" className="text-red-500 text-sm">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          aria-invalid={!!state.errors?.email}
        />
        {state.errors?.email && (
          <p id="email-error" className="text-red-500 text-sm">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </button>

      {state.success && <p className="text-green-500">{state.message}</p>}
    </form>
  );
}
```

---

## Logging and Monitoring

### Structured Logging

```typescript
// lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (process.env.NODE_ENV === "production") {
      // Send to logging service (e.g., LogTail, Datadog)
      console.log(JSON.stringify(entry));
    } else {
      // Pretty print in development
      console[level](message, context ?? "");
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(entry));
      // Send to error tracking (e.g., Sentry)
    } else {
      console.error(message, error ?? "", context ?? "");
    }
  }
}

export const logger = new Logger();
```

### Error Tracking Integration

```typescript
// lib/error-tracking.ts
import { AppError } from "@/lib/errors";

interface ErrorContext {
  userId?: string;
  requestId?: string;
  url?: string;
  [key: string]: unknown;
}

export function captureError(error: Error, context?: ErrorContext) {
  // Don't report operational errors in production
  if (error instanceof AppError && error.isOperational) {
    return;
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === "production") {
    // Example: Sentry integration
    // Sentry.captureException(error, { extra: context });

    console.error("Error captured:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  } else {
    console.error("Error:", error, context);
  }
}

// Usage in error boundary
export function logError(error: Error & { digest?: string }) {
  captureError(error, {
    digest: error.digest,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  });
}
```

### No Console in Production

```typescript
// [Bad] console.log in production code
function processOrder(order: Order) {
  console.log("Processing order:", order.id);
  // ...
}

// [Good] Use logger with proper levels
function processOrder(order: Order) {
  logger.info("Processing order", { orderId: order.id });
  // ...
}

// ESLint configuration to prevent console usage
// .eslintrc.js
module.exports = {
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
  },
};
```

---

## Best Practices Summary

1. **Create error class hierarchy** — Extend `Error` with specific types
2. **Consistent error format** — Define and use a standard response structure
3. **Never mix sync/async** — Deliver errors one way, not both
4. **Use error boundaries** — Implement `error.tsx` at appropriate levels
5. **Wrap API handlers** — Use middleware for consistent error handling
6. **Validate with Zod** — Parse inputs and return field-level errors
7. **Add context when wrapping** — Include helpful debugging information
8. **Log appropriately** — Structured logs in prod, readable in dev
9. **Track non-operational errors** — Report unexpected errors
10. **No console.log** — Use proper logging utilities

---

_Next: [Code Style](./05-code-style.md)_
