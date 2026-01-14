# Documentation

Good documentation is essential for maintainability and team collaboration. This guide covers TSDoc standards, README templates, API documentation, and Envato submission requirements.

---

## Table of Contents

1. [TSDoc Standard](#tsdoc-standard)
2. [What to Document](#what-to-document)
3. [Component Documentation](#component-documentation)
4. [README Standards](#readme-standards)
5. [API Documentation](#api-documentation)
6. [Inline Comments](#inline-comments)
7. [Architecture Documentation](#architecture-documentation)
8. [Envato Item Description](#envato-item-description)

---

## TSDoc Standard

TSDoc is the standard for documenting TypeScript code. It's compatible with most documentation generators and IDEs.

### Basic Syntax

````typescript
/**
 * Calculates the total price of an order including tax and discounts.
 *
 * @param order - The order to calculate
 * @param options - Optional calculation settings
 * @returns The total price in cents
 *
 * @example
 * ```typescript
 * const total = calculateTotal(order, { includeTax: true });
 * console.log(`Total: $${(total / 100).toFixed(2)}`);
 * ```
 *
 * @throws {@link ValidationError} When order has no items
 * @see {@link Order} for order structure
 * @since 1.2.0
 */
export function calculateTotal(
  order: Order,
  options: CalculateOptions = {}
): number {
  // Implementation
}
````

### Common Tags

| Tag                     | Purpose                 | Example                                       |
| ----------------------- | ----------------------- | --------------------------------------------- |
| `@param`                | Document parameter      | `@param name - User's full name`              |
| `@returns`              | Document return value   | `@returns The created user object`            |
| `@throws`               | Document exceptions     | `@throws {NotFoundError} When user not found` |
| `@example`              | Code example            | `@example \`\`\`ts ... \`\`\``                |
| `@see`                  | Reference related items | `@see {@link OtherFunction}`                  |
| `@deprecated`           | Mark as deprecated      | `@deprecated Use newFunction instead`         |
| `@since`                | Version added           | `@since 2.0.0`                                |
| `@default`              | Default value           | `@default 10`                                 |
| `@readonly`             | Mark as readonly        | `@readonly`                                   |
| `@public` / `@internal` | Visibility              | `@internal`                                   |

### Documenting Interfaces and Types

````typescript
/**
 * Represents a user in the system.
 *
 * @example
 * ```typescript
 * const user: User = {
 *   id: '123',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   role: 'admin',
 * };
 * ```
 */
export interface User {
  /** Unique identifier (UUID v4) */
  id: string;

  /** User's display name (2-100 characters) */
  name: string;

  /** Email address (must be unique) */
  email: string;

  /**
   * User's role in the system
   * @default 'user'
   */
  role: "admin" | "editor" | "user";

  /**
   * Account creation timestamp
   * @readonly
   */
  createdAt: Date;

  /**
   * Optional profile picture URL
   * @see {@link updateAvatar} to change this
   */
  avatar?: string;
}

/**
 * Valid status values for an order.
 *
 * - `pending` - Order placed, awaiting payment
 * - `paid` - Payment received, awaiting fulfillment
 * - `shipped` - Order shipped, in transit
 * - `delivered` - Order delivered to customer
 * - `cancelled` - Order cancelled
 */
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";
````

### Documenting Generics

````typescript
/**
 * A generic API response wrapper.
 *
 * @typeParam T - The type of data in the response
 *
 * @example
 * ```typescript
 * type UserResponse = ApiResponse<User>;
 * type UsersResponse = ApiResponse<User[]>;
 * ```
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;

  /** The response data (only present on success) */
  data?: T;

  /** Error information (only present on failure) */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Creates a paginated response from an array of items.
 *
 * @typeParam T - The type of items being paginated
 * @param items - All items to paginate
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated response with metadata
 *
 * @example
 * ```typescript
 * const response = paginate(users, 1, 10);
 * // { items: User[], page: 1, pageSize: 10, total: 100 }
 * ```
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  // Implementation
}
````

---

## What to Document

### Always Document

```typescript
// [Good] Public API functions
/**
 * Creates a new user account.
 *
 * @param data - User registration data
 * @returns Created user with generated ID
 * @throws {ConflictError} If email already exists
 */
export async function createUser(data: CreateUserInput): Promise<User> {}

// [Good] Complex business logic
/**
 * Calculates shipping cost based on weight, distance, and shipping method.
 *
 * The algorithm uses a base rate plus per-kg and per-km charges.
 * Express shipping doubles the base rate.
 * Free shipping is applied for orders over $100.
 *
 * @param order - Order with items and shipping address
 * @param method - Shipping method selection
 * @returns Shipping cost in cents
 */
export function calculateShipping(
  order: Order,
  method: ShippingMethod
): number {}

// [Good] Non-obvious workarounds
/**
 * Delays execution for the specified duration.
 *
 * @remarks
 * This is intentionally used before payment API calls because
 * the payment provider rate-limits requests that come too quickly
 * after account creation. See issue #1234.
 */
export function delay(ms: number): Promise<void> {}

// [Good] Configuration options
/**
 * Configuration for the authentication module.
 */
export interface AuthConfig {
  /**
   * JWT secret key for signing tokens.
   * Must be at least 32 characters in production.
   */
  jwtSecret: string;

  /**
   * Session duration before expiration.
   * @default '7d'
   */
  sessionDuration?: string;

  /**
   * Enable refresh token rotation for enhanced security.
   * @default true
   */
  rotateRefreshTokens?: boolean;
}
```

### Don't Over-Document

```typescript
// [Bad] Obvious code doesn't need comments
/**
 * Gets the user's name.
 * @returns The user's name
 */
function getName(): string {
  return this.name;
}

// [Good] Self-explanatory code needs no comment
function getName(): string {
  return this.name;
}

// [Bad] Comment repeats the code
// Increment the counter by 1
counter++;

// [Good] Only comment when adding value
// Reset to initial count after successful submission
counter = 0;
```

---

## Component Documentation

### Props Documentation

````typescript
/**
 * Props for the Button component.
 */
export interface ButtonProps {
  /** Button content (text, icons, or elements) */
  children: React.ReactNode;

  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: "primary" | "secondary" | "outline" | "ghost";

  /**
   * Button size
   * @default 'md'
   */
  size?: "sm" | "md" | "lg";

  /** Whether the button is disabled */
  disabled?: boolean;

  /** Whether to show loading spinner */
  loading?: boolean;

  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Icon to display before text
   * @example <Button leftIcon={<PlusIcon />}>Add</Button>
   */
  leftIcon?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * A flexible button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button onClick={handleClick}>Click me</Button>
 *
 * // With variants
 * <Button variant="secondary" size="lg">Large Secondary</Button>
 *
 * // With icon and loading
 * <Button leftIcon={<SaveIcon />} loading={isSaving}>
 *   Save Changes
 * </Button>
 * ```
 *
 * @see {@link IconButton} for icon-only buttons
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  onClick,
  leftIcon,
  className,
}: ButtonProps) {
  // Implementation
}
````

### Storybook Integration

```typescript
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component: "A flexible button component with multiple variants.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost"],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Button size",
    },
    disabled: {
      control: "boolean",
      description: "Disables the button",
    },
    loading: {
      control: "boolean",
      description: "Shows loading spinner",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Button",
    variant: "primary",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

---

## README Standards

### Project README Template

````markdown
# Project Name

Brief description of what this project does and who it's for.

![Project Screenshot](./docs/screenshot.png)

## Features

- [Good] Feature one with brief description
- [Good] Feature two with brief description
- [Good] Feature three with brief description

## Demo

[Live Demo](https://demo.example.com) | [Video Walkthrough](https://youtube.com/...)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma
- **Authentication**: NextAuth.js
- **Deployment**: Vercel

## Prerequisites

- Node.js 18.17 or higher
- npm, pnpm, or yarn
- PostgreSQL database

## Installation

1. Clone the repository

```bash
git clone https://github.com/username/project.git
cd project
```
````

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

4. Set up the database

```bash
npx prisma db push
npx prisma db seed
```

5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                  # Next.js App Router pages
│   ├── (auth)/          # Auth route group
│   ├── (dashboard)/     # Dashboard route group
│   └── api/             # API routes
├── components/          # React components
│   ├── ui/              # Base UI components
│   └── features/        # Feature-specific components
├── lib/                 # Utility functions and configs
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
└── prisma/              # Database schema and migrations
```

## Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run dev`      | Start development server |
| `npm run build`    | Build for production     |
| `npm run start`    | Start production server  |
| `npm run lint`     | Run ESLint               |
| `npm run test`     | Run tests                |
| `npm run test:e2e` | Run E2E tests            |

## Environment Variables

| Variable          | Description                  | Required |
| ----------------- | ---------------------------- | -------- |
| `DATABASE_URL`    | PostgreSQL connection string | Yes      |
| `NEXTAUTH_SECRET` | NextAuth.js secret key       | Yes      |
| `NEXTAUTH_URL`    | Application URL              | Yes      |
| `SMTP_HOST`       | Email server host            | No       |

## API Documentation

See [API.md](./docs/API.md) for detailed API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

## Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our server](https://discord.gg/...)
- 📖 Documentation: [docs.example.com](https://docs.example.com)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a list of changes.

````

### Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature in development

## [2.1.0] - 2024-03-15

### Added
- User profile page with avatar upload
- Email notification preferences
- Dark mode support

### Changed
- Improved search performance by 50%
- Updated dependencies to latest versions

### Fixed
- Cart total calculation with discounts
- Mobile navigation menu closing issue

### Security
- Fixed XSS vulnerability in comments

## [2.0.0] - 2024-02-01

### Changed
- **BREAKING**: Migrated to Next.js 14 App Router
- **BREAKING**: Changed API response format

### Removed
- Legacy Pages Router support

## [1.0.0] - 2024-01-01

### Added
- Initial release
````

---

## API Documentation

### Endpoint Documentation

```markdown
# API Documentation

## Authentication

All API endpoints (except `/api/auth/*`) require authentication.
Include the session cookie or Bearer token in requests.

### Headers
```

Authorization: Bearer <token>

```

---

## Users

### List Users

```

GET /api/users

````

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max 100) |
| search | string | - | Search by name or email |
| role | string | - | Filter by role |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
````

### Get User

```
GET /api/users/:id
```

**Response**

```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors**

| Status | Code      | Description    |
| ------ | --------- | -------------- |
| 404    | NOT_FOUND | User not found |

### Create User

```
POST /api/users
```

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "role": "user"
}
```

**Response** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors**

| Status | Code             | Description          |
| ------ | ---------------- | -------------------- |
| 400    | VALIDATION_ERROR | Invalid input        |
| 409    | CONFLICT         | Email already exists |

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Codes

| Code             | HTTP Status | Description              |
| ---------------- | ----------- | ------------------------ |
| VALIDATION_ERROR | 422         | Invalid request data     |
| UNAUTHORIZED     | 401         | Authentication required  |
| FORBIDDEN        | 403         | Insufficient permissions |
| NOT_FOUND        | 404         | Resource not found       |
| CONFLICT         | 409         | Resource already exists  |
| RATE_LIMITED     | 429         | Too many requests        |
| INTERNAL_ERROR   | 500         | Server error             |

````

---

## Inline Comments

### When to Comment

```typescript
// [Good] Explain WHY, not WHAT
// Using setTimeout to debounce rapid clicks that could
// trigger multiple payment requests (see incident #1234)
const handlePayment = debounce(processPayment, 300);

// [Good] Explain business logic
// Free shipping applies to orders over $50, except for
// oversized items which always incur shipping charges
if (orderTotal >= 50 && !hasOversizedItems) {
  shippingCost = 0;
}

// [Good] Warn about edge cases or gotchas
// WARNING: This array is mutated in place for performance.
// Clone before calling if you need to preserve the original.
function sortItems(items: Item[]): Item[] {
  return items.sort((a, b) => a.priority - b.priority);
}

// [Good] Reference external documentation
// Based on Stripe webhook handling best practices:
// https://stripe.com/docs/webhooks/best-practices
async function handleWebhook(event: Stripe.Event) {}
````

### TODO/FIXME Comments

```typescript
// [Good] Include ticket reference
// TODO(JIRA-123): Add pagination support
// TODO(@johndoe): Refactor this when we upgrade to v2

// [Good] Explain what needs to be fixed
// FIXME: This fails when quantity is 0, need to handle edge case
// HACK: Workaround for library bug, remove after v3.0 upgrade

// [Bad] Vague TODO with no context
// TODO: Fix this
// TODO: Make better
```

---

## Architecture Documentation

### Decision Records (ADRs)

```markdown
# ADR-001: Use Server Components by Default

## Status

Accepted

## Context

We need to decide on the default component strategy for our Next.js 14 application.
Options considered:

1. All Client Components (traditional React)
2. All Server Components
3. Server Components by default, Client Components as needed

## Decision

We will use Server Components by default and only use Client Components
when interactivity is required (hooks, event handlers, browser APIs).

## Rationale

- Reduces client-side JavaScript bundle
- Allows direct database access without API layer
- Better SEO with server-rendered content
- Aligns with Next.js 14 App Router best practices

## Consequences

- Team needs to understand Server/Client component boundaries
- Some libraries may not work in Server Components
- Need clear guidelines for when to use Client Components

## References

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
```

### System Architecture

```markdown
# System Architecture

## Overview
```

┌─────────────────────────────────────────────────────────────┐
│ Client │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Browser │ │ Mobile │ │ API │ │
│ │ (Next.js) │ │ App │ │ Clients │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ CDN / Edge │
│ (Vercel Edge Network / CloudFront) │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Application Layer │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Next.js │ │ API │ │ Workers │ │
│ │ Server │ │ Routes │ │ (Queue) │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Data Layer │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ PostgreSQL │ │ Redis │ │ S3 │ │
│ │ (Primary) │ │ (Cache) │ │ (Files) │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘

```

## Components

### Next.js Application
- Server Components for data fetching
- Client Components for interactivity
- API Routes for external integrations

### Database
- PostgreSQL for persistent data
- Prisma ORM for type-safe queries
- Redis for session and cache

### File Storage
- AWS S3 for user uploads
- CloudFront for CDN delivery
```

---

## Envato Item Description

### Required Information

```markdown
# Item Description Template for Envato

## Overview

[Project Name] is a modern, production-ready [type] built with Next.js 14,
TypeScript, and Tailwind CSS. It provides [key functionality] for [target users].

## Key Features

- [Good] Feature 1: Brief description
- [Good] Feature 2: Brief description
- [Good] Feature 3: Brief description
- [Good] Feature 4: Brief description
- [Good] Feature 5: Brief description

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth.js

## What's Included

- Source code (TypeScript)
- Documentation
- Figma design files (if applicable)
- Database schema
- Environment setup guide

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Requirements

- Node.js 18.17+
- PostgreSQL 14+
- npm/pnpm/yarn

## Documentation

Comprehensive documentation is included covering:

- Installation guide
- Configuration options
- API reference
- Deployment guide
- Customization guide

## Support

- 6 months of support included
- Response within 24-48 hours
- Bug fixes and compatibility updates

## Updates

- Regular updates for security and compatibility
- Changelog maintained for all versions

## Credits

- [Library Name](link) - MIT License
- [Icon Set](link) - CC BY 4.0
```

### Version History Section

```markdown
## Version History

### v2.1.0 (March 2024)

- Added: Dark mode support
- Added: Multi-language support (i18n)
- Improved: Dashboard performance
- Fixed: Mobile navigation issues

### v2.0.0 (February 2024)

- **Major Update**: Migrated to Next.js 14 App Router
- Added: Server Components for improved performance
- Added: Streaming and Suspense support
- Updated: All dependencies to latest versions

### v1.0.0 (January 2024)

- Initial release
```

---

## Best Practices Summary

1. **Use TSDoc format** — Compatible with all major tools
2. **Document public APIs** — Every exported function and type
3. **Explain WHY, not WHAT** — Code shows what, comments show why
4. **Keep README current** — Update with each release
5. **Document breaking changes** — Clear upgrade paths
6. **Include examples** — Show how to use complex APIs
7. **Maintain changelog** — Track all changes
8. **Document architecture** — Help new developers onboard
9. **Write for your audience** — Adjust detail level appropriately
10. **Don't over-document** — Obvious code needs no comments

---

_Next: [Project Structure](./11-project-structure.md)_
