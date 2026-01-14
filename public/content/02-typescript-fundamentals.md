# TypeScript Fundamentals

Master TypeScript's type system to write safer, more maintainable code. This guide covers essential patterns and best practices for professional TypeScript development.

---

## Table of Contents

1. [Strict Mode Configuration](#strict-mode-configuration)
2. [Type System Best Practices](#type-system-best-practices)
3. [Generics](#generics)
4. [Utility Types](#utility-types)
5. [Type Guards and Narrowing](#type-guards-and-narrowing)
6. [Enums vs Union Types](#enums-vs-union-types)
7. [Module System](#module-system)
8. [Naming Conventions](#naming-conventions)

---

## Strict Mode Configuration

Always enable strict mode in your `tsconfig.json`. This catches more errors at compile time and enforces better coding practices.

### Required Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### What Strict Mode Enables

| Flag                           | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `strictNullChecks`             | Enforces handling of `null` and `undefined`  |
| `strictFunctionTypes`          | Stricter checking of function types          |
| `strictBindCallApply`          | Stricter checking of `bind`, `call`, `apply` |
| `strictPropertyInitialization` | Ensures class properties are initialized     |
| `noImplicitAny`                | Error on expressions with implied `any` type |
| `noImplicitThis`               | Error on `this` with implied `any` type      |
| `alwaysStrict`                 | Emit `"use strict"` in JavaScript output     |

### Why Strict Mode Matters

```typescript
// Without strictNullChecks - Potential runtime error
function getLength(str: string) {
  return str.length; // No error, but str could be undefined at runtime
}

// With strictNullChecks - Catches at compile time
function getLength(str: string | undefined) {
  return str.length; // [Bad] Error: str might be undefined
}

// [Good] Correct: Handle the undefined case
function getLength(str: string | undefined) {
  if (!str) return 0;
  return str.length;
}
```

---

## Type System Best Practices

### Never Use `any`

The `any` type disables all type checking. Use `unknown` instead when the type is truly unknown.

```typescript
// [Bad] any turns off type checking
function processData(data: any) {
  return data.someProperty; // No error, but could crash at runtime
}

// [Good] unknown requires type checking
function processData(data: unknown) {
  if (typeof data === "object" && data !== null && "someProperty" in data) {
    return (data as { someProperty: unknown }).someProperty;
  }
  throw new Error("Invalid data structure");
}

// [Good] Better: Use a type guard
function isValidData(data: unknown): data is { someProperty: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "someProperty" in data &&
    typeof (data as { someProperty: unknown }).someProperty === "string"
  );
}

function processData(data: unknown) {
  if (isValidData(data)) {
    return data.someProperty; // Type is narrowed to string
  }
  throw new Error("Invalid data structure");
}
```

### Prefer Interfaces for Object Shapes

Use interfaces for defining object shapes. They provide better error messages and support declaration merging.

```typescript
// [Good] Interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// [Good] Type alias for unions and complex types
type UserRole = "admin" | "user" | "guest";
type UserWithRole = User & { role: UserRole };

// [Good] Type alias for function signatures
type UserValidator = (user: User) => boolean;

// [Good] Type alias for mapped types
type ReadonlyUser = Readonly<User>;
```

### Use `as const` for Literal Types

```typescript
// [Bad] Type is string[]
const ROLES = ["admin", "user", "guest"];

// [Good] Type is readonly ['admin', 'user', 'guest']
const ROLES = ["admin", "user", "guest"] as const;

// Now you can derive a union type
type Role = (typeof ROLES)[number]; // 'admin' | 'user' | 'guest'

// [Good] Object with as const
const STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
// 'pending' | 'active' | 'inactive'
```

### Discriminated Unions for State Management

Use discriminated unions for type-safe state handling.

```typescript
// [Good] Excellent: Discriminated union for async state
interface LoadingState {
  status: "loading";
}

interface SuccessState<T> {
  status: "success";
  data: T;
}

interface ErrorState {
  status: "error";
  error: Error;
}

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function renderUserList(state: AsyncState<User[]>) {
  switch (state.status) {
    case "loading":
      return <Spinner />;
    case "success":
      return <UserList users={state.data} />;
    case "error":
      return <ErrorMessage error={state.error} />;
  }
}
```

---

## Generics

Generics enable you to write reusable, type-safe code that works with multiple types.

### Basic Generics

```typescript
// [Good] Generic function
function identity<T>(value: T): T {
  return value;
}

const str = identity("hello"); // type: string
const num = identity(42); // type: number

// [Good] Generic interface
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

const userResponse: ApiResponse<User> = {
  data: {
    id: "1",
    name: "John",
    email: "john@example.com",
    createdAt: new Date(),
  },
  success: true,
};
```

### Generic Constraints

Use constraints to limit what types can be used with a generic.

```typescript
// [Good] Constraint to objects with id
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// [Good] Multiple constraints with keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "John", age: 30 };
const name = getProperty(user, "name"); // type: string
const age = getProperty(user, "age"); // type: number
```

### Generic Default Values

```typescript
// [Good] Default generic type
interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Can use with or without type parameter
const genericResponse: PaginatedResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
};
const userResponse: PaginatedResponse<User> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
};
```

### Common Generic Patterns

```typescript
// [Good] Repository pattern with generics
interface Repository<T extends HasId> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// [Good] Factory pattern with generics
function createStore<T>(initialValue: T) {
  let value = initialValue;

  return {
    get: () => value,
    set: (newValue: T) => {
      value = newValue;
    },
    update: (updater: (current: T) => T) => {
      value = updater(value);
    },
  };
}

const counterStore = createStore(0);
counterStore.set(10);
counterStore.update((n) => n + 1);
```

---

## Utility Types

TypeScript provides built-in utility types for common type transformations.

### Essential Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial<T> - All properties optional
type UpdateUserDTO = Partial<User>;

// Required<T> - All properties required
type RequiredUser = Required<User>;

// Readonly<T> - All properties readonly
type ImmutableUser = Readonly<User>;

// Pick<T, K> - Select specific properties
type UserCredentials = Pick<User, "email" | "password">;

// Omit<T, K> - Exclude specific properties
type PublicUser = Omit<User, "password">;

// Record<K, V> - Create object type from key-value pairs
type UserRoles = Record<string, "admin" | "user" | "guest">;

// Exclude<T, U> - Remove types from union
type NonNullableUser = Exclude<User | null | undefined, null | undefined>;

// Extract<T, U> - Extract types from union
type OnlyStrings = Extract<string | number | boolean, string>;

// NonNullable<T> - Remove null and undefined
type DefinitelyUser = NonNullable<User | null | undefined>;
```

### Function Utility Types

```typescript
function createUser(name: string, email: string): User {
  return {
    id: crypto.randomUUID(),
    name,
    email,
    password: "",
    createdAt: new Date(),
  };
}

// ReturnType<T> - Get function return type
type UserFromCreate = ReturnType<typeof createUser>; // User

// Parameters<T> - Get function parameter types as tuple
type CreateUserParams = Parameters<typeof createUser>; // [string, string]

// Awaited<T> - Unwrap Promise type
async function fetchUser(id: string): Promise<User> {
  // ...
}
type FetchedUser = Awaited<ReturnType<typeof fetchUser>>; // User
```

### Custom Utility Types

```typescript
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CreateUserDTO = PartialBy<User, "id" | "createdAt">;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Deep partial - all nested properties optional
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep readonly - all nested properties readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Nullable - make all properties nullable
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

---

## Type Guards and Narrowing

Type guards help TypeScript understand the specific type of a value at runtime.

### Built-in Type Guards

```typescript
function processValue(value: string | number | boolean | null) {
  // typeof guard
  if (typeof value === "string") {
    return value.toUpperCase(); // value is string
  }

  // instanceof guard
  if (value instanceof Date) {
    return value.toISOString();
  }

  // in operator guard
  if (typeof value === "object" && value !== null && "length" in value) {
    return value.length;
  }

  // Equality guard
  if (value === null) {
    return "null value"; // value is null
  }

  // Truthiness guard
  if (value) {
    return String(value); // value is number | boolean (truthy)
  }
}
```

### User-Defined Type Guards

```typescript
// [Good] Type predicate
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value &&
    typeof (value as User).id === "string" &&
    typeof (value as User).name === "string" &&
    typeof (value as User).email === "string"
  );
}

function processApiResponse(data: unknown) {
  if (isUser(data)) {
    console.log(data.name); // data is User
  }
}

// [Good] Type guard for arrays
function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}

// [Good] Type guard for discriminated unions
interface Dog {
  type: "dog";
  bark(): void;
}

interface Cat {
  type: "cat";
  meow(): void;
}

type Pet = Dog | Cat;

function isDog(pet: Pet): pet is Dog {
  return pet.type === "dog";
}
```

### Assertion Functions

```typescript
// [Good] Assertion function
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

function processInput(input: unknown) {
  assertIsString(input);
  // input is now string
  return input.toUpperCase();
}

// [Good] Non-null assertion function
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}
```

---

## Enums vs Union Types

In most cases, prefer union types over enums. They are simpler and produce less JavaScript code.

### When to Use Union Types (Preferred)

```typescript
// [Good] Preferred: Union types
type Status = "pending" | "active" | "inactive";
type Direction = "up" | "down" | "left" | "right";

// With as const for object-like structure
const OrderStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
} as const;

type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

// Usage
function updateOrderStatus(orderId: string, status: OrderStatusType) {
  // ...
}

updateOrderStatus("123", OrderStatus.SHIPPED);
```

### When Enums Are Acceptable

Use enums when you need reverse mapping (number to name) or when working with legacy code.

```typescript
// Acceptable: Numeric enum with reverse mapping
enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

// Reverse mapping works
const statusCode = HttpStatus.OK; // 200
const statusName = HttpStatus[200]; // 'OK'

// [Good] Const enum for zero runtime overhead
const enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Compiles to: const direction = 0;
const direction = Direction.Up;
```

### Anti-Patterns to Avoid

```typescript
// [Bad] String enum (use union type instead)
enum UserRole {
  Admin = "admin",
  User = "user",
  Guest = "guest",
}

// [Good] Union type
type UserRole = "admin" | "user" | "guest";

// [Bad] Heterogeneous enum (mixed values)
enum Mixed {
  Name = "string",
  Age = 30,
}
```

---

## Module System

Use ES modules consistently throughout your codebase.

### Import/Export Patterns

```typescript
// [Good] Named exports (preferred for most cases)
// utils/validators.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

// [Good] Import named exports
import { validateEmail, validatePassword } from "./utils/validators";

// [Good] Default export for main component/class
// components/Button.tsx
export default function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

// [Good] Re-export from barrel file
// components/index.ts
export { default as Button } from "./Button";
export { default as Input } from "./Input";
export * from "./types";
```

### Barrel Exports (index.ts)

```typescript
// [Good] Clean barrel exports
// features/users/index.ts
export { UserList } from "./components/UserList";
export { UserCard } from "./components/UserCard";
export { useUsers } from "./hooks/useUsers";
export type { User, CreateUserDTO } from "./types";

// Usage - clean imports
import { UserList, useUsers, type User } from "@/features/users";
```

### Avoiding Circular Dependencies

```typescript
// [Bad] Circular dependency
// types/user.ts
import { Order } from "./order"; // order.ts imports from user.ts
export interface User {
  orders: Order[];
}

// [Good] Separate shared types
// types/shared.ts
export interface User {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  userId: string;
}

// types/relations.ts
import type { User, Order } from "./shared";

export interface UserWithOrders extends User {
  orders: Order[];
}
```

### Type-Only Imports

```typescript
// [Good] Use type-only imports for types
import type { User, Order } from "./types";
import { validateUser } from "./validators";

// [Good] Inline type import
import { validateUser, type ValidationResult } from "./validators";
```

---

## Naming Conventions

Consistent naming improves code readability and maintainability.

### Summary Table

| Element            | Convention                         | Example                          |
| ------------------ | ---------------------------------- | -------------------------------- |
| Variables          | camelCase                          | `userName`, `isActive`           |
| Constants          | SCREAMING_SNAKE_CASE               | `MAX_RETRY_COUNT`, `API_URL`     |
| Functions          | camelCase                          | `getUserById`, `calculateTotal`  |
| Classes            | PascalCase                         | `UserService`, `OrderRepository` |
| Interfaces         | PascalCase (no I prefix)           | `User`, `ApiResponse`            |
| Type aliases       | PascalCase                         | `UserId`, `OrderStatus`          |
| Enums              | PascalCase                         | `HttpStatus`, `UserRole`         |
| Enum members       | PascalCase or SCREAMING_SNAKE_CASE | `HttpStatus.NotFound`            |
| React Components   | PascalCase                         | `UserProfile`, `NavigationBar`   |
| Hooks              | camelCase with `use` prefix        | `useUsers`, `useLocalStorage`    |
| Files (components) | PascalCase                         | `UserProfile.tsx`                |
| Files (utilities)  | kebab-case                         | `date-utils.ts`, `api-client.ts` |
| Directories        | kebab-case                         | `user-profile/`, `api-routes/`   |

### Detailed Examples

```typescript
// [Good] Variables: camelCase
const userName = "John";
const isActive = true;
const userCount = 42;

// [Good] Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = "https://api.example.com";
const DEFAULT_PAGE_SIZE = 20;

// [Good] Functions: camelCase, verb-first
function getUserById(id: string): User {
  /* ... */
}
function calculateOrderTotal(order: Order): number {
  /* ... */
}
function isValidEmail(email: string): boolean {
  /* ... */
}

// [Good] Interfaces: PascalCase, no I prefix
interface User {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
}

// [Good] Type aliases: PascalCase
type UserId = string;
type OrderStatus = "pending" | "shipped" | "delivered";
type UserWithOrders = User & { orders: Order[] };

// [Good] React components: PascalCase
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// [Good] Hooks: camelCase with use prefix
function useUsers() {
  // ...
}

function useLocalStorage<T>(key: string, initialValue: T) {
  // ...
}

// [Good] Boolean variables: is/has/can/should prefix
const isLoading = true;
const hasPermission = false;
const canEdit = true;
const shouldRefresh = false;

// [Good] Event handlers: handle prefix
function handleClick() {
  /* ... */
}
function handleSubmit(e: FormEvent) {
  /* ... */
}
function handleUserUpdate(user: User) {
  /* ... */
}
```

### File Naming

```
src/
├── components/
│   ├── UserProfile.tsx          # PascalCase for components
│   ├── UserProfile.test.tsx     # Test file matches component
│   └── UserProfile.module.css   # CSS module matches component
├── hooks/
│   └── use-users.ts             # kebab-case for hooks
├── utils/
│   ├── date-utils.ts            # kebab-case for utilities
│   └── api-client.ts
├── types/
│   └── user.ts                  # lowercase for type files
└── constants/
    └── config.ts                # lowercase for constant files
```

---

## Best Practices Summary

1. **Always use strict mode** — Enable all strict TypeScript checks
2. **Never use `any`** — Use `unknown` and type guards instead
3. **Prefer interfaces** — Use interfaces for object shapes
4. **Use `as const`** — For literal types and constant objects
5. **Leverage utility types** — Don't reinvent `Partial`, `Pick`, `Omit`
6. **Write type guards** — For runtime type checking
7. **Prefer union types** — Over string enums
8. **Use type-only imports** — For cleaner separation
9. **Follow naming conventions** — Consistency is key
10. **Document complex types** — With TSDoc comments

---

_Next: [Next.js Patterns](./03-nextjs-patterns.md)_
