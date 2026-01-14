# State Management

Effective state management is crucial for building maintainable React applications. This guide covers patterns for managing both server and client state in Next.js applications.

---

## Table of Contents

1. [State Categories](#state-categories)
2. [Server State with TanStack Query](#server-state-with-tanstack-query)
3. [Client State with Zustand](#client-state-with-zustand)
4. [React Context Patterns](#react-context-patterns)
5. [URL State Management](#url-state-management)
6. [Form State](#form-state)

---

## State Categories

| Type             | Description                 | Solution                          |
| ---------------- | --------------------------- | --------------------------------- |
| **Server State** | Data from API/database      | TanStack Query, Server Components |
| **Client State** | UI state, user preferences  | Zustand, Context                  |
| **URL State**    | Filters, pagination, search | searchParams, nuqs                |
| **Form State**   | Input values, validation    | React Hook Form                   |

### Decision Guide

```
Is the data from an API or database?
├─ Yes → Server State (TanStack Query or Server Components)
└─ No → Is it shared across many components?
         ├─ Yes → Client State (Zustand or Context)
         └─ No → Is it in the URL (filters, pagination)?
                  ├─ Yes → URL State (searchParams)
                  └─ No → Local State (useState)
```

---

## Server State with TanStack Query

Use TanStack Query for client-side data fetching, caching, and synchronization.

### Setup

```typescript
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

// app/providers.tsx
("use client");

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Query Hooks

```typescript
// hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api/users";

// Query keys factory
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch users
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters),
  });
}

// Fetch single user
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

### Usage in Components

```typescript
// components/UserList.tsx
"use client";

import { useUsers, useDeleteUser } from "@/hooks/use-users";
import { Skeleton } from "@/components/ui/Skeleton";

export function UserList({ filters }: { filters: UserFilters }) {
  const { data: users, isLoading, error } = useUsers(filters);
  const deleteUser = useDeleteUser();

  if (isLoading) {
    return <UserListSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>
          <span>{user.name}</span>
          <button
            onClick={() => deleteUser.mutate(user.id)}
            disabled={deleteUser.isPending}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### Optimistic Updates

```typescript
export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTodo,
    onMutate: async (newTodo) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: todoKeys.detail(newTodo.id),
      });

      // Snapshot previous value
      const previousTodo = queryClient.getQueryData(
        todoKeys.detail(newTodo.id)
      );

      // Optimistically update
      queryClient.setQueryData(todoKeys.detail(newTodo.id), newTodo);

      // Return context with snapshot
      return { previousTodo };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(
        todoKeys.detail(newTodo.id),
        context?.previousTodo
      );
    },
    onSettled: (_, __, { id }) => {
      // Refetch after success or error
      queryClient.invalidateQueries({ queryKey: todoKeys.detail(id) });
    },
  });
}
```

---

## Client State with Zustand

Use Zustand for global client state that doesn't come from a server.

### Store Setup

```typescript
// stores/cart-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "cart-storage",
    }
  )
);
```

### Using Store in Components

```typescript
// components/CartIcon.tsx
"use client";

import { useCartStore } from "@/stores/cart-store";

export function CartIcon() {
  // Only subscribe to itemCount - component won't re-render for other changes
  const itemCount = useCartStore((state) => state.itemCount());

  return (
    <button>
      <ShoppingCartIcon />
      {itemCount > 0 && <span className="badge">{itemCount}</span>}
    </button>
  );
}

// components/AddToCartButton.tsx
("use client");

import { useCartStore } from "@/stores/cart-store";

interface Props {
  product: Product;
}

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      onClick={() =>
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
        })
      }
    >
      Add to Cart
    </button>
  );
}

// components/CartTotal.tsx
("use client");

import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils/format";

export function CartTotal() {
  const total = useCartStore((state) => state.total());

  return <span>{formatCurrency(total)}</span>;
}
```

### Multiple Stores

```typescript
// stores/ui-store.ts
import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: "system",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));

// stores/auth-store.ts
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

---

## React Context Patterns

Use Context for dependency injection and theming, not for frequently changing state.

### Theme Context

```typescript
// context/theme-context.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    const resolved = theme === "system" ? systemTheme : theme;
    setResolvedTheme(resolved);

    root.classList.remove("light", "dark");
    root.classList.add(resolved);

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
```

### Split Contexts for Performance

```typescript
// [Bad] Single context with all state (causes unnecessary re-renders)
const AppContext = createContext({
  user: null,
  theme: "light",
  notifications: [],
  settings: {},
});

// [Good] Separate contexts for unrelated state
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>("light");
const NotificationsContext = createContext<Notification[]>([]);

// Each component only re-renders when its specific context changes
function UserMenu() {
  const user = useContext(UserContext); // Only re-renders on user change
  return <div>{user?.name}</div>;
}

function ThemeToggle() {
  const theme = useContext(ThemeContext); // Only re-renders on theme change
  return <button>{theme}</button>;
}
```

### Context with Reducer

```typescript
// context/notifications-context.tsx
"use client";

import { createContext, useContext, useReducer, type Dispatch } from "react";

interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

type Action =
  | { type: "ADD"; notification: Notification }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

function notificationsReducer(state: Notification[], action: Action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.notification];
    case "REMOVE":
      return state.filter((n) => n.id !== action.id);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

const NotificationsContext = createContext<Notification[]>([]);
const NotificationsDispatchContext = createContext<Dispatch<Action>>(() => {});

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, dispatch] = useReducer(notificationsReducer, []);

  return (
    <NotificationsContext.Provider value={notifications}>
      <NotificationsDispatchContext.Provider value={dispatch}>
        {children}
      </NotificationsDispatchContext.Provider>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function useNotificationsDispatch() {
  return useContext(NotificationsDispatchContext);
}

// Helper hooks
export function useToast() {
  const dispatch = useNotificationsDispatch();

  return {
    success: (message: string) =>
      dispatch({
        type: "ADD",
        notification: { id: crypto.randomUUID(), type: "success", message },
      }),
    error: (message: string) =>
      dispatch({
        type: "ADD",
        notification: { id: crypto.randomUUID(), type: "error", message },
      }),
  };
}
```

---

## URL State Management

Use URL parameters for state that should be shareable and bookmarkable.

### Search Params Hook

```typescript
// hooks/use-query-params.ts
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useQueryParams<T extends Record<string, string>>() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = Object.fromEntries(searchParams.entries()) as T;

  const setParams = useCallback(
    (newParams: Partial<T>) => {
      const current = new URLSearchParams(searchParams);

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      router.push(`${pathname}?${current.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const clearParams = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  return { params, setParams, clearParams };
}
```

### Filters Component

```typescript
// components/ProductFilters.tsx
"use client";

import { useQueryParams } from "@/hooks/use-query-params";

interface FilterParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

export function ProductFilters() {
  const { params, setParams } = useQueryParams<FilterParams>();

  return (
    <div className="filters">
      <select
        value={params.category || ""}
        onChange={(e) => setParams({ category: e.target.value })}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <select
        value={params.sort || ""}
        onChange={(e) => setParams({ sort: e.target.value })}
      >
        <option value="">Default Sort</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>

      <input
        type="number"
        placeholder="Min Price"
        value={params.minPrice || ""}
        onChange={(e) => setParams({ minPrice: e.target.value })}
      />

      <input
        type="number"
        placeholder="Max Price"
        value={params.maxPrice || ""}
        onChange={(e) => setParams({ maxPrice: e.target.value })}
      />
    </div>
  );
}
```

### Server Component with Search Params

```typescript
// app/products/page.tsx
interface Props {
  searchParams: {
    category?: string;
    sort?: string;
    page?: string;
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const { category, sort, page = "1" } = searchParams;

  const products = await getProducts({
    category,
    sort,
    page: parseInt(page, 10),
  });

  return (
    <div>
      <ProductFilters />
      <ProductGrid products={products} />
      <Pagination currentPage={parseInt(page, 10)} />
    </div>
  );
}
```

---

## Form State

Use React Hook Form for complex form state management.

### Basic Form

```typescript
// components/UserForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user"]),
});

type UserFormData = z.infer<typeof userSchema>;

interface Props {
  onSubmit: (data: UserFormData) => Promise<void>;
  defaultValues?: Partial<UserFormData>;
}

export function UserForm({ onSubmit, defaultValues }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register("name")} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register("email")} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="role">Role</label>
        <select id="role" {...register("role")}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && <span className="error">{errors.role.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### Form with Server Action

```typescript
// components/CreateUserForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { createUserSchema, type CreateUserInput } from "@/lib/schemas/user";
import { createUser } from "@/actions/user";
import { useToast } from "@/hooks/use-toast";

export function CreateUserForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });

  const onSubmit = (data: CreateUserInput) => {
    startTransition(async () => {
      const result = await createUser(data);

      if (result.errors) {
        // Set field errors from server
        Object.entries(result.errors).forEach(([field, messages]) => {
          setError(field as keyof CreateUserInput, {
            message: messages[0],
          });
        });
        return;
      }

      toast.success("User created successfully");
      reset();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

---

## Best Practices Summary

1. **Categorize state** — Server vs client vs URL vs form
2. **Use Server Components** — Fetch data on server when possible
3. **TanStack Query for client data** — Caching, invalidation, optimistic updates
4. **Zustand for client state** — Simple, performant global state
5. **Split contexts** — Avoid unnecessary re-renders
6. **URL state for filters** — Shareable, bookmarkable
7. **React Hook Form** — Complex form state and validation
8. **Selector patterns** — Subscribe to minimal state in Zustand
9. **Query key factories** — Consistent cache invalidation
10. **Persist when needed** — Cart, preferences, etc.

---

_Next: [API Design](./13-api-design.md)_
