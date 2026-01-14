# Code Style

Consistent code style improves readability and maintainability. This guide covers formatting, naming conventions, and tools for enforcing code quality.

---

## Table of Contents

1. [ESLint Configuration](#eslint-configuration)
2. [Prettier Configuration](#prettier-configuration)
3. [Naming Conventions](#naming-conventions)
4. [Code Organization](#code-organization)
5. [Comments and Documentation](#comments-and-documentation)
6. [Semicolons and Formatting](#semicolons-and-formatting)
7. [Prohibited Patterns](#prohibited-patterns)
8. [Git Conventions](#git-conventions)

---

## ESLint Configuration

Use ESLint to catch errors and enforce code standards automatically.

### Recommended Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react", "jsx-a11y", "import"],
  rules: {
    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],

    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/jsx-no-target-blank": "error",
    "react/self-closing-comp": "error",
    "react/jsx-curly-brace-presence": [
      "error",
      { props: "never", children: "never" },
    ],

    // React Hooks
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Imports
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "error",

    // General
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "prefer-const": "error",
    "no-var": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "public/",
    "*.config.js",
    "*.config.mjs",
  ],
};
```

### Required Dependencies

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  eslint-plugin-import eslint-config-prettier
```

### VS Code Integration

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

---

## Prettier Configuration

Use Prettier for consistent code formatting.

### Configuration File

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "printWidth": 80,
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Ignore File

```
# .prettierignore
node_modules/
.next/
out/
public/
*.min.js
package-lock.json
pnpm-lock.yaml
```

### VS Code Integration

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Naming Conventions

Consistent naming improves code readability and makes the codebase easier to navigate.

### Quick Reference

| Element        | Convention                         | Example                              |
| -------------- | ---------------------------------- | ------------------------------------ |
| Variables      | camelCase                          | `userName`, `isActive`, `orderCount` |
| Constants      | SCREAMING_SNAKE_CASE               | `MAX_RETRIES`, `API_URL`             |
| Functions      | camelCase                          | `getUserById`, `calculateTotal`      |
| Classes        | PascalCase                         | `UserService`, `OrderRepository`     |
| Interfaces     | PascalCase (no prefix)             | `User`, `ApiResponse`                |
| Types          | PascalCase                         | `UserId`, `OrderStatus`              |
| Enums          | PascalCase                         | `HttpStatus`                         |
| Components     | PascalCase                         | `UserProfile`, `NavBar`              |
| Hooks          | camelCase with `use`               | `useUsers`, `useLocalStorage`        |
| Event handlers | camelCase with `handle`            | `handleClick`, `handleSubmit`        |
| Boolean vars   | camelCase with `is/has/can/should` | `isLoading`, `hasPermission`         |

### Files and Directories

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx           # PascalCase for components
│   │   ├── Button.test.tsx      # Test file matches component
│   │   └── Button.module.css    # CSS module matches component
│   └── features/
│       └── user-profile/        # kebab-case for feature dirs
│           ├── UserProfile.tsx
│           ├── UserAvatar.tsx
│           └── index.ts         # Barrel export
├── hooks/
│   ├── use-users.ts             # kebab-case with use- prefix
│   └── use-local-storage.ts
├── lib/
│   ├── api-client.ts            # kebab-case for utilities
│   └── date-utils.ts
├── types/
│   ├── user.ts                  # lowercase for type files
│   └── api.ts
└── constants/
    └── config.ts                # lowercase
```

### Detailed Naming Examples

```typescript
// [Good] Variables: camelCase
const firstName = "John";
const activeUserCount = 42;
const orderItems = [];

// [Good] Boolean variables: is/has/can/should prefix
const isLoading = true;
const hasPermission = false;
const canEdit = true;
const shouldRefresh = false;
const isAuthenticated = user !== null;

// [Good] Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = "https://api.example.com";
const DEFAULT_PAGE_SIZE = 20;
const MILLISECONDS_PER_DAY = 86_400_000;

// [Good] Functions: camelCase, verb-first
function getUserById(id: string): User {}
function calculateOrderTotal(order: Order): number {}
function isValidEmail(email: string): boolean {}
function formatCurrency(amount: number): string {}
async function fetchUserOrders(userId: string): Promise<Order[]> {}

// [Good] Classes and services: PascalCase, noun
class UserRepository {}
class OrderService {}
class PaymentProcessor {}

// [Good] Interfaces: PascalCase, noun (no I prefix)
interface User {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
}

// [Bad] Hungarian notation
interface IUser {} // Don't use I prefix
type TUser = {}; // Don't use T prefix

// [Good] Type aliases: PascalCase
type UserId = string;
type OrderStatus = "pending" | "shipped" | "delivered";
type UserWithOrders = User & { orders: Order[] };

// [Good] Generics: Single uppercase letter or descriptive PascalCase
function identity<T>(value: T): T {}
function mapResponse<TData, TError>(
  response: Response
): Result<TData, TError> {}

// [Good] React components: PascalCase
function UserProfile({ user }: { user: User }) {}
function NavigationBar() {}
function ShoppingCart() {}

// [Good] Hooks: camelCase with use prefix
function useUsers() {}
function useLocalStorage<T>(key: string, initialValue: T) {}
function useMediaQuery(query: string) {}

// [Good] Event handlers: handle prefix
function handleClick() {}
function handleSubmit(e: FormEvent) {}
function handleUserUpdate(user: User) {}
function handleInputChange(e: ChangeEvent<HTMLInputElement>) {}

// [Good] Callback props: on prefix
interface ButtonProps {
  onClick: () => void;
  onHover?: () => void;
}

// [Good] Render functions: render prefix
function renderUserList(users: User[]) {}
function renderEmptyState() {}
```

### Abbreviations

```typescript
// [Good] Treat abbreviations as words
const userId = "123"; // Not userID
const httpClient = new Client(); // Not HTTPClient
const apiUrl = "/api/users"; // Not APIURL

function getHtmlContent() {} // Not getHTMLContent
class JsonParser {} // Not JSONParser

// Exception: Two-letter abbreviations stay uppercase
const ioStream = getStream(); // IO is acceptable
```

---

## Code Organization

### Import Order

Organize imports in a consistent order:

```typescript
// 1. Built-in modules (Node.js)
import { readFile } from "fs/promises";
import path from "path";

// 2. External dependencies
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// 3. Internal aliases (@/)
import { Button } from "@/components/ui/Button";
import { useUsers } from "@/hooks/use-users";

// 4. Parent directory imports
import { validateOrder } from "../utils/validation";

// 5. Sibling imports
import { OrderItem } from "./OrderItem";

// 6. Type-only imports
import type { User, Order } from "@/types";
```

### File Structure

```typescript
// 1. Imports (organized as above)
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import type { User } from "@/types";

// 2. Types and interfaces (if local to file)
interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

// 3. Constants
const MAX_NAME_LENGTH = 100;

// 4. Helper functions (if not exported)
function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// 5. Main component/function
export function UserProfile({ user, onUpdate }: Props) {
  // State declarations first
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Event handlers
  const handleSubmit = () => {
    // ...
  };

  // Render helpers (if complex)
  const renderEditForm = () => {
    // ...
  };

  // Main render
  return <div>{isEditing ? renderEditForm() : <span>{name}</span>}</div>;
}

// 6. Subcomponents (if tightly coupled)
function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatar} alt={user.name} />;
}

// 7. Default export (if needed)
export default UserProfile;
```

### Export Patterns

```typescript
// [Good] Named exports (preferred)
export function getUserById(id: string): User {}
export const DEFAULT_PAGE_SIZE = 20;
export interface User {}

// [Good] Barrel exports for grouping
// components/ui/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Select } from "./Select";

// [Good] Re-export with rename
export { Button as UIButton } from "./Button";

// [Good] Acceptable: Default export for pages/layouts in Next.js
// app/page.tsx
export default function HomePage() {}

// [Avoid] Mixing default and named exports
export default function Component() {}
export const helper = () => {}; // Confusing to import
```

---

## Comments and Documentation

### When to Comment

```typescript
// [Good] Explain WHY, not WHAT
// We use a 5-second delay because the payment provider
// rate limits requests that come too quickly after creation.
await delay(5000);

// [Good] Document non-obvious business logic
// Discounts can only be applied to orders above $50
// as per the marketing team's policy (see JIRA-1234).
if (order.total >= 50) {
  applyDiscount(order);
}

// [Good] Warn about edge cases
// IMPORTANT: This function mutates the input array.
// Clone before calling if you need to preserve the original.
function sortInPlace(arr: number[]) {
  arr.sort((a, b) => a - b);
}

// [Bad] Obvious comments
// Get the user
const user = getUser(id);

// Increment counter
counter++;

// Check if user exists
if (user) {
}
```

### TSDoc Format

````typescript
/**
 * Calculates the total price of an order including tax and discounts.
 *
 * @param order - The order to calculate the total for
 * @param options - Calculation options
 * @returns The calculated total in cents
 *
 * @example
 * ```ts
 * const total = calculateOrderTotal(order, { includeTax: true });
 * console.log(`Total: $${total / 100}`);
 * ```
 *
 * @throws {@link ValidationError} if order has no items
 * @see {@link Order} for the order structure
 */
export function calculateOrderTotal(
  order: Order,
  options: { includeTax?: boolean; applyDiscounts?: boolean } = {}
): number {
  // Implementation
}

/**
 * Represents a user in the system.
 *
 * @property id - Unique identifier
 * @property email - User's email address (unique)
 * @property name - Display name
 * @property role - User's permission level
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "guest";
}
````

### TODO and FIXME Conventions

```typescript
// TODO: Add pagination support (JIRA-123)
// TODO(john): Refactor this to use the new API

// FIXME: This breaks when count is negative (JIRA-456)

// HACK: Workaround for browser bug, remove after Chrome 120
// See: https://bugs.chromium.org/p/chromium/issues/detail?id=...

// NOTE: This intentionally uses == instead of === for null coalescing
```

---

## Semicolons and Formatting

### Mandatory Semicolons

Semicolons are **required** at the end of every statement. Do not rely on Automatic Semicolon Insertion (ASI).

```typescript
// [Good] Explicit semicolons
const name = "John";
const age = 30;
const greet = () => console.log("Hello");

// [Bad] Missing semicolons (relies on ASI)
const name = "John";
const age = 30;
const greet = () => console.log("Hello");

// ASI can cause bugs:
const getValue = () => {
  return; // ASI inserts semicolon here!
  {
    value: 42;
  } // This is never returned
};
// getValue() returns undefined, not { value: 42 }
```

### Quote Style

Use single quotes for strings, except when the string contains a single quote.

```typescript
// [Good] Single quotes
const name = "John";
const greeting = "Hello, World!";

// [Good] Double quotes when string contains single quote
const message = "It's a beautiful day";

// [Good] Template literals for interpolation
const fullName = `${firstName} ${lastName}`;

// [Bad] Double quotes for regular strings
const name = "John";
```

### Trailing Commas

Use trailing commas in multi-line structures (ES5 compatible).

```typescript
// [Good] Trailing commas
const user = {
  name: "John",
  email: "john@example.com",
  age: 30, // Trailing comma
};

const colors = [
  "red",
  "green",
  "blue", // Trailing comma
];

function createUser(
  name: string,
  email: string,
  role: string // Trailing comma in parameters
) {
  // ...
}

// [Good] Benefits:
// - Cleaner git diffs when adding new items
// - Easier to reorder items
// - Copy-paste without syntax errors
```

### Line Length

Keep lines under 80 characters. Break long statements appropriately.

```typescript
// [Good] Break long statements
const longMessage =
  "This is a very long message that would exceed " +
  "the 80 character limit if written on a single line.";

// [Good] Break long conditions
if (user.isActive && user.hasPermission("edit") && order.status === "pending") {
  // ...
}

// [Good] Break long function calls
const result = await prisma.user.findMany({
  where: {
    isActive: true,
    role: "admin",
  },
  include: {
    orders: true,
    profile: true,
  },
  orderBy: {
    createdAt: "desc",
  },
});

// [Good] Break long chains
const processedData = data
  .filter((item) => item.isActive)
  .map((item) => transformItem(item))
  .sort((a, b) => a.name.localeCompare(b.name));
```

---

## Prohibited Patterns

### No `eval`

Never use `eval()` or any form of dynamic code execution.

```typescript
// [Bad] Forbidden: eval
eval('console.log("Hello")');

// [Bad] Forbidden: Function constructor (equivalent to eval)
const fn = new Function("a", "b", "return a + b");

// [Bad] Forbidden: setTimeout/setInterval with strings
setTimeout('console.log("Hello")', 1000);

// [Good] Use proper functions
const add = (a: number, b: number) => a + b;
setTimeout(() => console.log("Hello"), 1000);
```

### No Native Object Extension

Never modify native object prototypes.

```typescript
// [Bad] Forbidden: Extending native prototypes
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

// [Good] Use utility functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

// [Good] Use modern array methods
const lastItem = arr.at(-1);
```

### No `any` Type

Avoid `any` at all costs. Use `unknown` with type guards when type is truly unknown.

```typescript
// [Bad] any type
function processData(data: any) {
  return data.value; // No type safety
}

// [Good] unknown with type guard
function processData(data: unknown) {
  if (isValidData(data)) {
    return data.value; // Type-safe
  }
  throw new Error("Invalid data");
}

// [Good] explicit types
function processData(data: { value: number }) {
  return data.value;
}

// If you MUST use any (extremely rare), add eslint-disable comment with justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Third-party library has incorrect types
const externalData: any = thirdPartyLib.getData();
```

### No Console in Production

Remove all `console.log` statements before production.

```typescript
// [Bad] console.log in production code
function processOrder(order: Order) {
  console.log("Processing order:", order);
  // ...
}

// [Good] Use a logging utility
import { logger } from "@/lib/logger";

function processOrder(order: Order) {
  logger.info("Processing order", { orderId: order.id });
  // ...
}

// [Good] Debug-only logging (removed in production builds)
if (process.env.NODE_ENV === "development") {
  console.log("Debug info:", data);
}
```

### Always Use Radix with parseInt

The `parseInt()` function can return unexpected results if the radix is not supplied.

```typescript
// [Bad] Missing radix - can produce unexpected results
const value = parseInt("08"); // Could be 0 in older engines (octal)
const port = parseInt(userInput); // Ambiguous

// [Good] Always specify radix
const value = parseInt("08", 10); // 8 (decimal)
const port = parseInt(userInput, 10);
const hex = parseInt("FF", 16); // 255 (hexadecimal)
const binary = parseInt("1010", 2); // 10 (binary)

// [Good] Alternative: Use Number() for decimal conversion
const value = Number("08"); // 8
const port = Number(userInput); // NaN if invalid
```

### No Global Variables

Variables are not allowed in the global scope unless absolutely necessary. If a global is needed within a function, explicitly use `window.` rather than omitting variable declaration.

```typescript
// [Bad] Implicit global (missing declaration)
function processData() {
  result = computeValue(); // Creates global!
}

// [Bad] Polluting global scope
var globalCounter = 0;
var appConfig = {};

// [Good] If global is absolutely necessary, be explicit
function initializeApp() {
  window.myAppConfig = { version: "1.0.0" }; // Explicit global
}

// [Good] Use modules to avoid globals entirely
// config.ts
export const appConfig = {
  version: "1.0.0",
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
};

// [Good] Use React Context for shared state
const AppContext = createContext<AppConfig | null>(null);
```

### No Variable Re-declaration

Re-declaring local variables is considered bad practice, even though it's not a syntax error with `var`.

```typescript
// [Bad] Re-declaring variables
function processUser(user: User) {
  var name = user.firstName;
  // ... 50 lines later ...
  var name = user.lastName; // Re-declaration!
}

// [Good] Use unique, descriptive names
function processUser(user: User) {
  const firstName = user.firstName;
  const lastName = user.lastName;
  const fullName = `${firstName} ${lastName}`;
}

// [Good] Use const/let which prevent re-declaration
const name = "John";
const name = "Jane"; // Error: Cannot redeclare block-scoped variable
```

### No Var

Use `const` by default, `let` when reassignment is needed. Never use `var`.

```typescript
// [Bad] var (function-scoped, hoisted)
var count = 0;
for (var i = 0; i < 10; i++) {
  // i leaks out of loop
}

// [Good] const (default choice)
const users = await getUsers();
const total = calculateTotal(users);

// [Good] let (when reassignment needed)
let retries = 0;
while (retries < 3) {
  retries++;
}
```

---

## Git Conventions

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `docs`     | Documentation changes                   |
| `style`    | Code style (formatting, semicolons)     |
| `refactor` | Code change that neither fixes nor adds |
| `perf`     | Performance improvement                 |
| `test`     | Adding or updating tests                |
| `chore`    | Build, tooling, dependencies            |
| `ci`       | CI/CD changes                           |
| `revert`   | Revert a previous commit                |

### Examples

```bash
# Feature
git commit -m "feat(auth): add password reset functionality"

# Fix
git commit -m "fix(cart): correct total calculation with discounts"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change (add ! after type)
git commit -m "feat(api)!: change user endpoint response format"

# With body and footer
git commit -m "fix(orders): handle edge case with empty cart

The order submission was failing silently when the cart was empty.
Now it shows a validation error to the user.

Fixes #123"
```

### Branch Naming

```
<type>/<ticket-id>-<short-description>
```

```bash
# Examples
feature/JIRA-123-add-user-profile
fix/JIRA-456-cart-total-bug
docs/update-api-documentation
refactor/improve-auth-flow
```

### Pre-commit Hooks

Use Husky and lint-staged for automated checks:

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

---

## Complete Configuration Files

### ESLint + Prettier + TypeScript

Create these configuration files in your project root:

```bash
# Install dependencies
npm install -D eslint prettier typescript @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y eslint-plugin-import eslint-config-prettier \
  prettier-plugin-tailwindcss husky lint-staged
```

### Recommended VS Code Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## Best Practices Summary

1. **Configure ESLint** — Catch errors before runtime
2. **Configure Prettier** — Consistent formatting automatically
3. **Follow naming conventions** — Improves readability
4. **Organize imports** — Group and order consistently
5. **Comment strategically** — Explain why, not what
6. **Use TSDoc** — Document public APIs
7. **Require semicolons** — Don't rely on ASI
8. **Prohibit dangerous patterns** — No eval, any, var
9. **Use conventional commits** — Clear commit history
10. **Set up pre-commit hooks** — Automate quality checks

---

_Next: [Performance](./06-performance.md)_
