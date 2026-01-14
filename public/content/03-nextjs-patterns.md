# Next.js Patterns

Master Next.js 14+ App Router patterns for building performant, production-ready applications. This guide covers server components, data fetching, routing, and optimization strategies.

---

## Table of Contents

1. [App Router Architecture](#app-router-architecture)
2. [Server vs Client Components](#server-vs-client-components)
3. [Data Fetching Patterns](#data-fetching-patterns)
4. [Server Actions](#server-actions)
5. [Routing Patterns](#routing-patterns)
6. [Layouts and Templates](#layouts-and-templates)
7. [Metadata and SEO](#metadata-and-seo)
8. [Image and Font Optimization](#image-and-font-optimization)

---

## App Router Architecture

The App Router uses a file-system based router with support for layouts, nested routing, and React Server Components by default.

### Directory Structure

```
app/
├── (auth)/                      # Route group (no URL impact)
│   ├── login/
│   │   └── page.tsx             # /login
│   └── register/
│       └── page.tsx             # /register
├── (dashboard)/                 # Another route group
│   ├── layout.tsx               # Shared dashboard layout
│   ├── page.tsx                 # /
│   └── settings/
│       └── page.tsx             # /settings
├── api/                         # API routes
│   └── users/
│       └── route.ts             # /api/users
├── users/
│   ├── page.tsx                 # /users
│   ├── [id]/                    # Dynamic segment
│   │   ├── page.tsx             # /users/:id
│   │   └── loading.tsx          # Loading UI
│   └── [...slug]/               # Catch-all segment
│       └── page.tsx             # /users/*
├── layout.tsx                   # Root layout
├── loading.tsx                  # Global loading
├── error.tsx                    # Global error boundary
├── not-found.tsx                # 404 page
└── global-error.tsx             # Root error boundary
```

### File Conventions

| File            | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `page.tsx`      | Unique UI for a route, makes route accessible       |
| `layout.tsx`    | Shared UI for a segment and its children            |
| `template.tsx`  | Like layout, but creates new instance on navigation |
| `loading.tsx`   | Loading UI using React Suspense                     |
| `error.tsx`     | Error UI using React Error Boundary                 |
| `not-found.tsx` | UI for 404 errors                                   |
| `route.ts`      | API endpoint                                        |
| `default.tsx`   | Fallback for parallel routes                        |

### Route Groups

Use parentheses to organize routes without affecting the URL structure.

```typescript
// [Good] Organizational route groups
app/
├── (marketing)/           # Marketing pages
│   ├── layout.tsx         # Marketing-specific layout
│   ├── page.tsx           # Home page /
│   ├── about/             # /about
│   └── contact/           # /contact
├── (shop)/                # E-commerce pages
│   ├── layout.tsx         # Shop-specific layout
│   ├── products/          # /products
│   └── cart/              # /cart
└── (auth)/                # Auth pages
    ├── layout.tsx         # Minimal auth layout
    ├── login/             # /login
    └── register/          # /register
```

---

## Server vs Client Components

By default, all components in the App Router are Server Components. Use `'use client'` only when necessary.

### When to Use Server Components (Default)

```typescript
// [Good] Server Component (default) - No directive needed
// Runs on the server, has access to backend resources
async function UserList() {
  // Direct database access
  const users = await prisma.user.findMany();

  // Environment variables (including secrets)
  const apiKey = process.env.API_SECRET;

  // File system access
  const data = await fs.readFile("./data.json", "utf-8");

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### When to Use Client Components

```typescript
"use client";

// [Good] Client Component - Interactive UI
import { useState, useEffect } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  // Browser APIs
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}
```

### Decision Guide

| Feature Needed                  | Component Type |
| ------------------------------- | -------------- |
| Fetch data                      | Server [Good]      |
| Access backend resources        | Server [Good]      |
| Use sensitive info (API keys)   | Server [Good]      |
| Reduce client JavaScript        | Server [Good]      |
| Use hooks (useState, useEffect) | Client [Good]      |
| Use browser APIs                | Client [Good]      |
| Add event listeners             | Client [Good]      |
| Use Context                     | Client [Good]      |

### Composition Pattern: Server with Client Islands

```typescript
// app/users/page.tsx (Server Component)
import { SearchInput } from "@/components/SearchInput";
import { UserList } from "@/components/UserList";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <h1>Users</h1>
      {/* Client component for interactivity */}
      <SearchInput />
      {/* Server component for data display */}
      <UserList users={users} />
    </div>
  );
}

// components/SearchInput.tsx
("use client");

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/users?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
    </form>
  );
}
```

### The 'use client' Boundary

```typescript
// [Bad] Marking a parent unnecessarily as client
"use client";

export default function Layout({ children }) {
  // Everything below this is now client-rendered
  return <div>{children}</div>;
}

// [Good] Keep 'use client' at the leaf level
// layout.tsx (Server Component)
export default function Layout({ children }) {
  return (
    <div>
      <ServerComponent />
      <ClientComponent /> {/* Only this is client-side */}
      {children}
    </div>
  );
}
```

---

## Data Fetching Patterns

### Server-Side Data Fetching

```typescript
// [Good] Fetch in server components
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  return <ProductDetails product={product} />;
}

// [Good] Parallel data fetching
async function DashboardPage() {
  // Fetch in parallel, not sequentially
  const [users, orders, stats] = await Promise.all([
    getUsers(),
    getOrders(),
    getStats(),
  ]);

  return (
    <div>
      <UserList users={users} />
      <OrderList orders={orders} />
      <StatsCard stats={stats} />
    </div>
  );
}
```

### Caching Strategies

```typescript
// [Good] Static data (cached indefinitely)
async function getStaticData() {
  const res = await fetch("https://api.example.com/data", {
    cache: "force-cache", // Default
  });
  return res.json();
}

// [Good] Revalidate after time period
async function getTimedData() {
  const res = await fetch("https://api.example.com/data", {
    next: { revalidate: 3600 }, // Revalidate every hour
  });
  return res.json();
}

// [Good] Dynamic data (never cached)
async function getDynamicData() {
  const res = await fetch("https://api.example.com/data", {
    cache: "no-store",
  });
  return res.json();
}

// [Good] Tag-based revalidation
async function getTaggedData() {
  const res = await fetch("https://api.example.com/products", {
    next: { tags: ["products"] },
  });
  return res.json();
}

// Revalidate by tag
import { revalidateTag } from "next/cache";

export async function updateProduct() {
  // Update product...
  revalidateTag("products");
}
```

### Data Fetching with Suspense

```typescript
// page.tsx
import { Suspense } from "react";
import { UserList, UserListSkeleton } from "@/components/UserList";

export default function Page() {
  return (
    <div>
      <h1>Users</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}

// components/UserList.tsx
async function UserList() {
  const users = await getUsers(); // This suspends
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Request Memoization

```typescript
// [Good] Same request is automatically deduplicated
// These will result in only ONE database query
async function Layout({ children }) {
  const user = await getUser(); // Call 1
  return (
    <div>
      <Header user={user} />
      {children}
    </div>
  );
}

async function Page() {
  const user = await getUser(); // Call 2 - deduplicated!
  return <Profile user={user} />;
}

// [Good] Use React cache for non-fetch functions
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
});
```

---

## Server Actions

Server Actions are asynchronous functions that execute on the server. Use them for form submissions and data mutations.

### Basic Server Action

```typescript
// actions/users.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const validatedFields = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.create({
    data: validatedFields.data,
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}`);
}
```

### Using Server Actions in Forms

```typescript
// components/CreateUserForm.tsx
"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/users";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, null);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
        {state?.errors?.name && <p className="error">{state.errors.name[0]}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        {state?.errors?.email && (
          <p className="error">{state.errors.email[0]}</p>
        )}
      </div>

      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
"use client";

import { useOptimistic } from "react";
import { addTodo } from "@/actions/todos";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: string) => [
      ...state,
      { id: "temp", title: newTodo, completed: false },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const title = formData.get("title") as string;
    addOptimisticTodo(title);
    await addTodo(formData);
  }

  return (
    <div>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="title" required />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
```

---

## Routing Patterns

### Dynamic Routes

```typescript
// app/products/[id]/page.tsx
interface Props {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProduct(params.id);
  const variant = searchParams.variant;

  return <ProductDetails product={product} variant={variant} />;
}

// Generate static params for Static Site Generation
export async function generateStaticParams() {
  const products = await getProducts();

  return products.map((product) => ({
    id: product.id,
  }));
}
```

### Catch-All Routes

```typescript
// app/docs/[...slug]/page.tsx
interface Props {
  params: { slug: string[] };
}

export default function DocsPage({ params }: Props) {
  // /docs/intro -> slug = ['intro']
  // /docs/getting-started/install -> slug = ['getting-started', 'install']
  const fullPath = params.slug.join("/");

  return <DocContent path={fullPath} />;
}

// Optional catch-all: [[...slug]]
// app/shop/[[...slug]]/page.tsx
// Matches /shop, /shop/category, /shop/category/product
```

### Route Handlers (API Routes)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  const users = await prisma.user.findMany({
    where: query ? { name: { contains: query } } : undefined,
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const user = await prisma.user.create({
    data: body,
  });

  return NextResponse.json(user, { status: 201 });
}

// app/api/users/[id]/route.ts
interface Context {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Context) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
```

### Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get("token");

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Add headers
  const response = NextResponse.next();
  response.headers.set("x-custom-header", "value");

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### URL State Management

```typescript
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function Filters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <select
        value={searchParams.get("sort") ?? ""}
        onChange={(e) => updateFilter("sort", e.target.value)}
      >
        <option value="">Default</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
    </div>
  );
}
```

---

## Layouts and Templates

### Root Layout

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### Nested Layouts

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
}

// This layout wraps all pages under /dashboard/*
```

### Error Boundaries

```typescript
// app/error.tsx
"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    // Log error to monitoring service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/global-error.tsx (for root layout errors)
("use client");

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
        <h2>Something went wrong!</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

### Loading States

```typescript
// app/users/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}
```

---

## Metadata and SEO

### Static Metadata

```typescript
// app/about/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Company Name",
  description: "Learn about our company and mission.",
  openGraph: {
    title: "About Us | Company Name",
    description: "Learn about our company and mission.",
    images: ["/og-about.jpg"],
  },
};

export default function AboutPage() {
  return <div>About content</div>;
}
```

### Dynamic Metadata

```typescript
// app/products/[id]/page.tsx
import { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}
```

### Structured Data (JSON-LD)

```typescript
// app/products/[id]/page.tsx
import { Product, WithContext } from "schema-dts";

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);

  const jsonLd: WithContext<Product> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetails product={product} />
    </>
  );
}
```

---

## Image and Font Optimization

### Next.js Image Component

```typescript
import Image from "next/image";

// [Good] Optimized image with dimensions
function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority // Load immediately for LCP images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}

// [Good] Fill container
function HeroImage({ src }: { src: string }) {
  return (
    <div className="relative h-96 w-full">
      <Image src={src} alt="Hero" fill className="object-cover" sizes="100vw" />
    </div>
  );
}

// [Good] Responsive sizes
function ResponsiveImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

### Next.js Font Optimization

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

// globals.css
// :root {
//   --font-inter: 'Inter', sans-serif;
//   --font-roboto-mono: 'Roboto Mono', monospace;
// }
//
// body {
//   font-family: var(--font-inter);
// }
//
// code {
//   font-family: var(--font-roboto-mono);
// }
```

### Local Fonts

```typescript
import localFont from "next/font/local";

const myFont = localFont({
  src: [
    {
      path: "../fonts/MyFont-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/MyFont-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});
```

---

## Best Practices Summary

1. **Default to Server Components** — Only use `'use client'` when needed
2. **Fetch data on the server** — Avoid client-side fetching when possible
3. **Use parallel data fetching** — `Promise.all` for independent requests
4. **Leverage caching** — Configure appropriate revalidation strategies
5. **Use Server Actions** — For form submissions and mutations
6. **Manage URL state** — Use searchParams for filterable/searchable UIs
7. **Optimize images** — Always use `next/image` with proper sizing
8. **Optimize fonts** — Use `next/font` for zero layout shift
9. **Implement proper error handling** — Use error.tsx boundaries
10. **Add loading states** — Use loading.tsx or Suspense

---

_Next: [Error Handling](./04-error-handling.md)_
