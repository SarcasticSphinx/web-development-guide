# Project Structure

A well-organized project structure improves maintainability and helps developers navigate the codebase efficiently. This guide covers recommended directory organization for Next.js applications.

---

## Table of Contents

1. [Recommended Structure](#recommended-structure)
2. [App Directory](#app-directory)
3. [Components Organization](#components-organization)
4. [Feature-Based Organization](#feature-based-organization)
5. [Shared Code](#shared-code)
6. [Configuration Files](#configuration-files)

---

## Recommended Structure

```
project-root/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   └── users/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Global error
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Modal/
│   ├── layout/                   # Layout components
│   │   ├── Header/
│   │   ├── Footer/
│   │   └── Sidebar/
│   └── features/                 # Feature components
│       ├── auth/
│       ├── users/
│       └── products/
│
├── lib/                          # Utilities and configurations
│   ├── api/                      # API client and helpers
│   ├── auth/                     # Auth utilities
│   ├── db/                       # Database client
│   ├── errors/                   # Error classes
│   ├── schemas/                  # Zod schemas
│   └── utils/                    # General utilities
│
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts
│   ├── use-media-query.ts
│   └── use-local-storage.ts
│
├── actions/                      # Server Actions
│   ├── auth.ts
│   ├── users.ts
│   └── products.ts
│
├── types/                        # TypeScript types
│   ├── api.ts
│   ├── user.ts
│   └── index.ts
│
├── constants/                    # Constants and config
│   ├── routes.ts
│   └── config.ts
│
├── prisma/                       # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                  # Environment template
├── .eslintrc.js                  # ESLint config
├── .prettierrc                   # Prettier config
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## App Directory

### Route Groups

Use parentheses to organize routes without affecting URLs:

```
app/
├── (marketing)/              # Marketing pages
│   ├── layout.tsx            # Marketing layout
│   ├── page.tsx              # Home page (/)
│   ├── about/                # /about
│   ├── pricing/              # /pricing
│   └── contact/              # /contact
│
├── (auth)/                   # Authentication
│   ├── layout.tsx            # Minimal auth layout
│   ├── login/                # /login
│   ├── register/             # /register
│   └── forgot-password/      # /forgot-password
│
├── (dashboard)/              # Authenticated area
│   ├── layout.tsx            # Dashboard layout with sidebar
│   ├── page.tsx              # Dashboard home (/dashboard or /)
│   ├── settings/             # /settings
│   │   ├── page.tsx
│   │   ├── profile/
│   │   └── security/
│   └── users/                # /users
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
│
└── api/                      # API routes
    ├── auth/
    │   └── [...nextauth]/
    └── users/
        ├── route.ts          # GET, POST /api/users
        └── [id]/
            └── route.ts      # GET, PUT, DELETE /api/users/:id
```

### Page Structure

Each route should follow a consistent structure:

```
app/(dashboard)/users/
├── page.tsx                  # Main page component
├── loading.tsx               # Loading UI
├── error.tsx                 # Error boundary
├── layout.tsx                # (Optional) Nested layout
├── _components/              # Page-specific components (not routes)
│   ├── UserTable.tsx
│   └── UserFilters.tsx
└── [id]/
    ├── page.tsx              # User detail page
    └── edit/
        └── page.tsx          # Edit user page
```

### Private Folders

Prefix with underscore to exclude from routing:

```
app/
├── _components/              # Shared components (not routes)
├── _lib/                     # App-specific utilities
└── users/
    ├── page.tsx
    └── _components/          # Page-specific components
        └── UserCard.tsx
```

---

## Components Organization

### UI Components

Base UI components should be small, reusable, and follow a consistent structure:

```
components/ui/Button/
├── Button.tsx                # Component implementation
├── Button.test.tsx           # Tests
├── Button.stories.tsx        # Storybook stories
├── Button.module.css         # Styles (if using CSS modules)
└── index.ts                  # Barrel export
```

```typescript
// components/ui/Button/index.ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";

// components/ui/Button/Button.tsx
import styles from "./Button.module.css";

export interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### UI Components Barrel Export

```typescript
// components/ui/index.ts
export * from "./Button";
export * from "./Input";
export * from "./Select";
export * from "./Modal";
export * from "./Card";
export * from "./Badge";
export * from "./Avatar";
export * from "./Skeleton";
export * from "./Toast";
```

### Layout Components

```
components/layout/
├── Header/
│   ├── Header.tsx
│   ├── Navigation.tsx
│   ├── UserMenu.tsx
│   └── index.ts
├── Footer/
│   ├── Footer.tsx
│   └── index.ts
├── Sidebar/
│   ├── Sidebar.tsx
│   ├── SidebarNav.tsx
│   └── index.ts
└── index.ts
```

---

## Feature-Based Organization

For larger applications, organize by feature domain:

```
components/features/
├── auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   └── index.ts
│
├── users/
│   ├── UserCard.tsx
│   ├── UserList.tsx
│   ├── UserForm.tsx
│   ├── UserAvatar.tsx
│   └── index.ts
│
├── products/
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ProductForm.tsx
│   ├── ProductFilters.tsx
│   └── index.ts
│
├── cart/
│   ├── CartItem.tsx
│   ├── CartSummary.tsx
│   ├── CartDrawer.tsx
│   └── index.ts
│
└── checkout/
    ├── CheckoutForm.tsx
    ├── PaymentForm.tsx
    ├── ShippingForm.tsx
    └── index.ts
```

### Feature Module Structure

For complex features, create a complete module:

```
features/
└── orders/
    ├── components/           # Feature-specific components
    │   ├── OrderCard.tsx
    │   ├── OrderList.tsx
    │   ├── OrderDetails.tsx
    │   └── index.ts
    ├── hooks/                # Feature-specific hooks
    │   ├── use-orders.ts
    │   └── use-order-filters.ts
    ├── actions/              # Feature-specific actions
    │   └── order-actions.ts
    ├── schemas/              # Feature-specific schemas
    │   └── order-schema.ts
    ├── types/                # Feature-specific types
    │   └── order-types.ts
    ├── utils/                # Feature-specific utilities
    │   └── order-utils.ts
    └── index.ts              # Barrel export
```

---

## Shared Code

### Lib Directory

```
lib/
├── api/
│   ├── client.ts             # API client configuration
│   ├── endpoints.ts          # API endpoint definitions
│   └── helpers.ts            # API helper functions
│
├── auth/
│   ├── session.ts            # Session management
│   ├── permissions.ts        # Permission utilities
│   └── dal.ts                # Data Access Layer for auth
│
├── db/
│   └── prisma.ts             # Prisma client singleton
│
├── errors/
│   ├── base.ts               # Base error class
│   ├── http.ts               # HTTP errors
│   └── index.ts              # Barrel export
│
├── schemas/
│   ├── user.ts               # User schemas
│   ├── product.ts            # Product schemas
│   └── common.ts             # Shared schemas
│
└── utils/
    ├── format.ts             # Formatting utilities
    ├── date.ts               # Date utilities
    ├── string.ts             # String utilities
    └── cn.ts                 # Class name utility
```

### Hooks Directory

```
hooks/
├── use-auth.ts               # Authentication hook
├── use-debounce.ts           # Debounce hook
├── use-local-storage.ts      # Local storage hook
├── use-media-query.ts        # Media query hook
├── use-intersection.ts       # Intersection observer hook
├── use-clipboard.ts          # Clipboard hook
└── index.ts                  # Barrel export
```

### Types Directory

```
types/
├── api.ts                    # API types
├── user.ts                   # User types
├── product.ts                # Product types
├── order.ts                  # Order types
├── common.ts                 # Common/shared types
└── index.ts                  # Barrel export
```

### Constants Directory

```
constants/
├── routes.ts                 # Route constants
├── config.ts                 # App configuration
├── messages.ts               # User-facing messages
└── index.ts                  # Barrel export
```

```typescript
// constants/routes.ts
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  SETTINGS: "/settings",
  USERS: "/users",
  USER_DETAIL: (id: string) => `/users/${id}`,
} as const;

// constants/config.ts
export const CONFIG = {
  APP_NAME: "My App",
  DEFAULT_PAGE_SIZE: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
} as const;
```

---

## Configuration Files

### Root Configuration

```
project-root/
├── .env                      # Local environment (gitignored)
├── .env.example              # Environment template
├── .env.local                # Local overrides (gitignored)
├── .eslintrc.js              # ESLint configuration
├── .prettierrc               # Prettier configuration
├── .gitignore                # Git ignore patterns
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest configuration
├── playwright.config.ts      # Playwright configuration
└── package.json              # Dependencies and scripts
```

### Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/hooks/*": ["hooks/*"],
      "@/types/*": ["types/*"],
      "@/constants/*": ["constants/*"],
      "@/actions/*": ["actions/*"]
    }
  }
}
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true
}
```

---

## Best Practices Summary

1. **Use route groups** — Organize routes without affecting URLs
2. **Colocate related code** — Keep tests and styles with components
3. **Use barrel exports** — Simplify imports with index.ts files
4. **Feature-based organization** — Group by domain for large apps
5. **Path aliases** — Use @/ prefix for cleaner imports
6. **Consistent naming** — Follow the naming conventions guide
7. **Separate concerns** — Keep UI, logic, and data fetching separate
8. **Private folders** — Use \_ prefix for non-route folders
9. **Shared libraries** — Centralize utilities in lib/
10. **Configuration files** — Keep at project root

---

_Next: [State Management](./12-state-management.md)_
