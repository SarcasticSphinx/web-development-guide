# Common Mistakes

Avoid these frequently encountered pitfalls that negatively impact Core Web Vitals (LCP, INP, FCP) and overall application performance. This comprehensive guide covers architectural, performance, security, and data management mistakes in Next.js applications.

---

## Table of Contents

### Server & Client Component Architecture

1. [Putting `use client` Too High in Component Tree](#putting-use-client-too-high-in-component-tree)
2. [Not Refactoring for a Client Component](#not-refactoring-for-a-client-component)
3. [Thinking a Component is Server-side Without `use client`](#thinking-a-component-is-server-side-without-use-client)
4. [Wrapping Server Components in Client Components](#wrapping-server-components-in-client-components)
5. [Using State Management on the Server](#using-state-management-on-the-server)
6. [Using `use server` to Create Server Components](#using-use-server-to-create-server-components)
7. [Accidentally Leaking Sensitive Data via Props](#accidentally-leaking-sensitive-data-via-props)
8. [Thinking Client Components Only Run in Client](#thinking-client-components-only-run-in-client)
9. [Using Browser APIs Incorrectly](#using-browser-apis-incorrectly)
10. [Getting Hydration Errors](#getting-hydration-errors)
11. [Incorrectly Dealing with Third-Party Components](#incorrectly-dealing-with-third-party-components)

### Data Fetching & Mutations

12. [Fetching Data via Route Handlers Unnecessarily](#fetching-data-via-route-handlers-unnecessarily)
13. [Fearing Duplicate Data Fetching](#fearing-duplicate-data-fetching)
14. [Creating Waterfalls When Fetching Data](#creating-waterfalls-when-fetching-data)
15. [Submitting Data Manually to Route Handlers](#submitting-data-manually-to-route-handlers)
16. [View Doesn't Update After Mutation](#view-doesnt-update-after-mutation)
17. [Thinking Server Actions Only Work in Server Components](#thinking-server-actions-only-work-in-server-components)
18. [Forgetting to Validate and Protect Server Actions](#forgetting-to-validate-and-protect-server-actions)
19. [Using `use server` to Limit Code to Server](#using-use-server-to-limit-code-to-server)
20. [Sending Too Much Data to the Client](#sending-too-much-data-to-the-client)

### Routing & Parameters

21. [Misunderstanding Dynamic Routes vs. Search Params](#misunderstanding-dynamic-routes-vs-search-params)
22. [Incorrectly Working with Search Params](#incorrectly-working-with-search-params)

### Performance, Loading & Rendering

23. [CSS-in-JS Runtime Overhead](#css-in-js-runtime-overhead)
24. [CSS Modules with Lazy-Loaded Components](#css-modules-with-lazy-loaded-components)
25. [Missing Dynamic Imports](#missing-dynamic-imports)
26. [Using Third-Party Font CDNs](#using-third-party-font-cdns)
27. [Not Using next/image Correctly](#not-using-nextimage-correctly)
28. [Unoptimized Third-Party Scripts](#unoptimized-third-party-scripts)
29. [Skipping the React Compiler](#skipping-the-react-compiler)
30. [Excessive Client-Side Logic](#excessive-client-side-logic)
31. [Heavy Middleware Logic](#heavy-middleware-logic)
32. [Forgetting Loading States](#forgetting-loading-states)
33. [Not Being Granular with Suspense Boundaries](#not-being-granular-with-suspense-boundaries)
34. [Putting Suspense in the Wrong Place](#putting-suspense-in-the-wrong-place)
35. [Forgetting the `key` Prop for Suspense](#forgetting-the-key-prop-for-suspense)
36. [Accidentally Making a Page Dynamic](#accidentally-making-a-page-dynamic)

### Security & Utilities

37. [Hardcoding Secrets in Components](#hardcoding-secrets-in-components)
38. [Not Separating Client and Server Utilities](#not-separating-client-and-server-utilities)
39. [Using `redirect()` Inside try/catch](#using-redirect-inside-trycatch)

---

## Server & Client Component Architecture

### Putting `use client` Too High in Component Tree

**The Mistake**

Placing the `use client` directive at the top of a parent page file forces all imported children to become Client Components as well. This causes you to lose Server Component benefits, such as keeping large dependencies on the server and fetching data directly.

```typescript
// [Bad] Entire page is now a Client Component
"use client";

async function getProducts() {
  const res = await fetch("/api/products");
  return res.json();
}

export default function ProductsPage() {
  const [filter, setFilter] = useState("");
  const products = getProducts(); // Can't use async in Client Component!

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ProductList products={products} />
      <ProductStats products={products} />
    </div>
  );
}
```

**Impact**

- Increases bundle size by including server-only code in client bundles
- Loses ability to fetch data directly on server
- Forces all child components to be Client Components
- Negatively impacts **LCP** and **FCP** due to larger JavaScript bundles

**Solution**

Move `use client` to the "leaves" of your component tree—specific smaller components (like buttons or inputs) that actually need interactivity.

```typescript
// [Good] Server Component (default)
async function ProductsPage() {
  const products = await getProducts(); // Can fetch on server

  return (
    <div>
      <SearchInput /> {/* Only this is a Client Component */}
      <ProductList products={products} />
      <ProductStats products={products} />
    </div>
  );
}

// components/SearchInput.tsx
("use client");

export function SearchInput() {
  const [filter, setFilter] = useState("");

  return <input value={filter} onChange={(e) => setFilter(e.target.value)} />;
}
```

---

### Not Refactoring for a Client Component

**The Mistake**

When adding interactivity (like an `onClick` event) to a page, developers often convert the entire page file to a Client Component rather than extracting the interactive logic.

```typescript
// [Bad] Entire page converted to Client Component for one button
"use client";

export default function BlogPost() {
  const [liked, setLiked] = useState(false);

  return (
    <article>
      <h1>My Blog Post</h1>
      <div>Content here...</div>
      <button onClick={() => setLiked(!liked)}>
        {liked ? "Unlike" : "Like"}
      </button>
    </article>
  );
}
```

**Impact**

- Loses Server Component benefits for the entire page
- Increases client-side JavaScript bundle
- Can't use server-side data fetching in the page

**Solution**

Extract the interactive element into a separate component, add `use client` to that file, and import it into your Server Component page.

```typescript
// [Good] Server Component page
export default function BlogPost() {
  return (
    <article>
      <h1>My Blog Post</h1>
      <div>Content here...</div>
      <LikeButton /> {/* Client Component */}
    </article>
  );
}

// components/LikeButton.tsx
("use client");

export function LikeButton() {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? "Unlike" : "Like"}
    </button>
  );
}
```

---

### Thinking a Component is Server-side Without `use client`

**The Mistake**

A component does not need `use client` at the top to become a Client Component. If it is imported into a file that already has `use client`, it is automatically treated as a Client Component.

```typescript
// components/Counter.tsx
// No "use client" directive
export function Counter() {
  const [count, setCount] = useState(0); // This will error!

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

// app/page.tsx
("use client");

import { Counter } from "@/components/Counter";

export default function Page() {
  return <Counter />; // Counter becomes Client Component but has no directive
}
```

**Impact**

- Component may work in some contexts but fail in others
- Makes component dependencies unclear
- Can cause runtime errors when component is imported into Server Components

**Solution**

Explicitly add `use client` to any component that uses hooks or state, so it works correctly regardless of where it is imported.

```typescript
// [Good] Explicit directive
"use client";

export function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

---

### Wrapping Server Components in Client Components

**The Mistake**

If you wrap a Server Component inside a Client Component by passing it as a `children` prop, it remains a Server Component. It does _not_ automatically become a Client Component unless you import it directly _into_ the Client Component file.

```typescript
// [Bad] Attempting to convert Server Component
"use client";

import { ServerData } from "./ServerData"; // Direct import converts it!

export function ClientWrapper() {
  return (
    <div>
      <ServerData /> {/* Now it's a Client Component - loses server benefits */}
    </div>
  );
}
```

**Impact**

- Misunderstanding can lead to incorrect architecture
- May force Server Components to become Client Components unintentionally
- Loses server-side rendering benefits

**Solution**

Pass Server Components as `children` to preserve their server-side nature.

```typescript
// [Good] Pass as children to preserve Server Component
// app/page.tsx (Server Component)
export default function Page() {
  return (
    <ClientWrapper>
      <ServerData /> {/* Stays a Server Component */}
    </ClientWrapper>
  );
}

// components/ClientWrapper.tsx
("use client");

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}
```

---

### Using State Management on the Server

**The Mistake**

Hooks like `useState`, `useEffect`, or `createContext` (Context API) generally do not work on the server. The server handles a request-response cycle and does not maintain state like a browser does.

```typescript
// [Bad] Using React hooks in Server Component
export default function Page() {
  const [count, setCount] = useState(0); // Error!

  useEffect(() => {
    // Error!
    console.log("Component mounted");
  }, []);

  return <div>Count: {count}</div>;
}
```

**Impact**

- Runtime errors in Server Components
- Application crashes or undefined behavior
- Breaks server-side rendering

**Solution**

Use hooks only in Client Components marked with `use client`.

```typescript
// [Good] Client Component for state management
"use client";

export default function Page() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Component mounted");
  }, []);

  return <div>Count: {count}</div>;
}
```

---

### Using `use server` to Create Server Components

**The Mistake**

The `use server` directive is not used to define a Server Component (which is the default in the App Router). It is exclusively used to define **Server Actions** (functions exposed as POST endpoints).

```typescript
// [Bad] Misusing "use server"
"use server"; // Wrong! This creates Server Actions, not Server Components

export default function Page() {
  return <div>Hello</div>;
}
```

**Impact**

- Creates unintended Server Action endpoints
- Confusion about component boundaries
- Security risks from exposing functions as public endpoints

**Solution**

Don't use any directive for Server Components (they're the default). Use `use server` only for Server Actions.

```typescript
// [Good] Server Component (no directive needed)
export default function Page() {
  return <div>Hello</div>;
}

// [Good] Server Action (use "use server")
("use server");

export async function createUser(formData: FormData) {
  const name = formData.get("name");
  await db.user.create({ data: { name } });
}
```

---

### Accidentally Leaking Sensitive Data via Props

**The Mistake**

When passing data from a Server Component to a Client Component, that data crosses a network boundary and is visible in the browser. Passing a full user object that includes a password hash will expose that secret to the client.

```typescript
// [Bad] Passing sensitive data to Client Component
// app/profile/page.tsx (Server Component)
async function ProfilePage() {
  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  // user includes: passwordHash, internalNotes, etc.
  return <ProfileClient user={user} />; // Leaks sensitive data!
}

// components/ProfileClient.tsx
("use client");

export function ProfileClient({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

**Impact**

- **Critical security vulnerability** - exposes passwords, tokens, internal data
- Violates data privacy regulations
- Can be exploited by attackers

**Solution**

Filter data on the server and only pass what the client needs to display.

```typescript
// [Good] Filter sensitive data
// types/user.ts
interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

// app/profile/page.tsx (Server Component)
async function ProfilePage() {
  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  // Only send public fields
  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  return <ProfileClient user={publicUser} />;
}
```

---

### Thinking Client Components Only Run in Client

**The Mistake**

Client Components run in the browser, but they also run **once on the server** to generate the initial HTML (pre-rendering). Therefore, console logs in a Client Component will appear in your server terminal during the initial render.

```typescript
// [Bad] Assuming this only runs in browser
"use client";

export function Component() {
  console.log("Where am I?"); // Appears in server terminal too!

  return <div>Hello</div>;
}
```

**Impact**

- Confusion about execution environment
- Server-side errors from browser-only code
- Performance issues from double execution

**Solution**

Understand that Client Components pre-render on the server. Use `useEffect` for browser-only code.

```typescript
// [Good] Separate server and client execution
"use client";

import { useEffect } from "react";

export function Component() {
  console.log("Runs on both server and client");

  useEffect(() => {
    console.log("Only runs in browser");
  }, []);

  return <div>Hello</div>;
}
```

---

### Using Browser APIs Incorrectly

**The Mistake**

Because Client Components run once on the server, accessing `window` or `localStorage` directly in the component body causes an error (as they don't exist on the server).

```typescript
// [Bad] Accessing window directly
"use client";

export function Component() {
  const theme = localStorage.getItem("theme"); // Error on server!

  return <div>Theme: {theme}</div>;
}
```

**Impact**

- Runtime errors during server-side rendering
- Application crashes
- Hydration mismatches

**Solution**

Access these APIs inside `useEffect` or check `if (typeof window !== 'undefined')`.

```typescript
// [Good] Safe browser API access
"use client";

import { useEffect, useState } from "react";

export function Component() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    // Only runs in browser
    setTheme(localStorage.getItem("theme"));
  }, []);

  return <div>Theme: {theme ?? "loading..."}</div>;
}

// [Good] Alternative with typeof check
("use client");

export function Component() {
  const theme =
    typeof window !== "undefined" ? localStorage.getItem("theme") : null;

  return <div>Theme: {theme}</div>;
}
```

---

### Getting Hydration Errors

**The Mistake**

This occurs when the HTML generated on the server differs from what the browser renders. Common causes include using `localStorage` to conditionally render UI (the server sees "undefined," the browser sees the value) or invalid HTML structure (like a `<div>` inside a `<p>`).

```typescript
// [Bad] Causes hydration mismatch
"use client";

export function Component() {
  const theme = localStorage.getItem("theme"); // undefined on server

  return <div className={theme === "dark" ? "dark" : "light"}>Content</div>;
}

// [Bad] Invalid HTML structure
export function Article() {
  return (
    <p>
      <div>This causes hydration error</div>
    </p>
  );
}
```

**Impact**

- Console errors and warnings
- React has to discard server HTML and re-render
- Poor performance and user experience
- Impacts **FCP** and **LCP**

**Solution**

Ensure server and client render the same initial HTML. Use `useEffect` for browser-only state.

```typescript
// [Good] Consistent rendering
"use client";

import { useEffect, useState } from "react";

export function Component() {
  const [theme, setTheme] = useState("light"); // Server sees "light"

  useEffect(() => {
    // Update after hydration
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setTheme(savedTheme);
  }, []);

  return <div className={theme}>Content</div>;
}

// [Good] Valid HTML structure
export function Article() {
  return (
    <div>
      <p>Text content</p>
      <div>More content</div>
    </div>
  );
}

// [Good] Use suppressHydrationWarning for dynamic content
export function TimeStamp() {
  return <time suppressHydrationWarning>{new Date().toLocaleString()}</time>;
}
```

---

### Incorrectly Dealing with Third-Party Components

**The Mistake**

Many third-party libraries export components that use hooks but don't have `use client` added to them yet. Using them directly in a Server Component causes errors.

```typescript
// [Bad] Third-party component without "use client"
import { Slider } from "some-ui-library"; // Uses hooks but no "use client"

export default function Page() {
  return <Slider />; // Error in Server Component!
}
```

**Impact**

- Build or runtime errors
- Cannot use third-party UI libraries
- Forces entire page to be Client Component

**Solution**

Create a wrapper component with `use client` that exports the third-party component.

```typescript
// [Good] Wrap third-party component
// components/SliderWrapper.tsx
"use client";

export { Slider } from "some-ui-library";

// app/page.tsx (Server Component)
import { Slider } from "@/components/SliderWrapper";

export default function Page() {
  return <Slider />; // Works!
}

// [Good] Alternative - create wrapper component
("use client");

import { Slider as ExternalSlider } from "some-ui-library";

export function Slider(props) {
  return <ExternalSlider {...props} />;
}
```

---

## Data Fetching & Mutations

### Fetching Data via Route Handlers Unnecessarily

**The Mistake**

Developers often create a separate API route (`route.ts`) just to fetch data for a Server Component. This is redundant; you should fetch data directly inside the Server Component.

```typescript
// [Bad] Unnecessary API route
// app/api/products/route.ts
export async function GET() {
  const products = await db.product.findMany();
  return Response.json(products);
}

// app/products/page.tsx
async function ProductsPage() {
  const res = await fetch("/api/products");
  const products = await res.json();

  return <ProductList products={products} />;
}
```

**Impact**

- Extra network round-trip
- Increased latency
- More code to maintain
- Worse **TTFB** and **LCP**

**Solution**

Fetch data directly in Server Components using your database client or ORM.

```typescript
// [Good] Direct database access
// app/products/page.tsx
async function ProductsPage() {
  const products = await db.product.findMany();

  return <ProductList products={products} />;
}
```

---

### Fearing Duplicate Data Fetching

**The Mistake**

Developers may prop-drill data to avoid fetching it twice. However, React automatically deduplicates identical `fetch` requests in the same render pass, and Next.js has a Data Cache that persists results.

```typescript
// [Bad] Prop drilling to avoid "duplicate" fetches
async function Page() {
  const user = await getUser();

  return (
    <div>
      <Header user={user} />
      <Sidebar user={user} />
      <Content user={user} />
    </div>
  );
}
```

**Impact**

- Unnecessary prop drilling
- Tight coupling between components
- Harder to maintain code

**Solution**

Fetch data where you need it. Next.js automatically deduplicates requests.

```typescript
// [Good] Fetch where needed - automatically deduplicated
async function Page() {
  return (
    <div>
      <Header /> {/* Fetches user */}
      <Sidebar /> {/* Fetches user - deduplicated */}
      <Content /> {/* Fetches user - deduplicated */}
    </div>
  );
}

async function Header() {
  const user = await getUser(); // Cached
  return <header>{user.name}</header>;
}

async function Sidebar() {
  const user = await getUser(); // Uses cache
  return <aside>{user.email}</aside>;
}

// lib/api.ts
export async function getUser() {
  return fetch("https://api.example.com/user", {
    next: { revalidate: 3600 }, // Cache for 1 hour
  }).then((res) => res.json());
}
```

---

### Creating Waterfalls When Fetching Data

**The Mistake**

Fetching data sequentially (using `await` one after another) blocks the UI and creates slow loading times.

```typescript
// [Bad] Sequential fetching (waterfall)
async function Page() {
  const user = await getUser();
  const posts = await getPosts();
  const comments = await getComments();

  return <Dashboard user={user} posts={posts} comments={comments} />;
}
```

**Impact**

- Slow page loads
- Poor **LCP** and **TTFB**
- Unnecessary waiting time

**Solution**

Use `Promise.all()` to initiate independent fetches in parallel.

```typescript
// [Good] Parallel fetching
async function Page() {
  const [user, posts, comments] = await Promise.all([
    getUser(),
    getPosts(),
    getComments(),
  ]);

  return <Dashboard user={user} posts={posts} comments={comments} />;
}

// [Good] With error handling
async function Page() {
  const [user, posts, comments] = await Promise.allSettled([
    getUser(),
    getPosts(),
    getComments(),
  ]);

  return (
    <Dashboard
      user={user.status === "fulfilled" ? user.value : null}
      posts={posts.status === "fulfilled" ? posts.value : []}
      comments={comments.status === "fulfilled" ? comments.value : []}
    />
  );
}
```

---

### Submitting Data Manually to Route Handlers

**The Mistake**

Instead of manually creating API routes and `POST` requests for form submissions, use **Server Actions**. You can pass a server function to the `action` prop of a form.

```typescript
// [Bad] Manual API route + fetch
// app/api/create-product/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  await db.product.create({ data: body });
  return Response.json({ success: true });
}

// components/ProductForm.tsx
("use client");

export function ProductForm() {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    await fetch("/api/create-product", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Impact**

- More boilerplate code
- No Progressive Enhancement
- Manual error handling required
- More code to maintain

**Solution**

Use Server Actions for form submissions with automatic Progressive Enhancement.

```typescript
// [Good] Server Action
// actions/product.ts
"use server";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;

  await db.product.create({
    data: { name },
  });

  revalidatePath("/products");
}

// components/ProductForm.tsx
import { createProduct } from "@/actions/product";

export function ProductForm() {
  return (
    <form action={createProduct}>
      <input name="name" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

---

### View Doesn't Update After Mutation

**The Mistake**

After a Server Action updates data, the client-side cache may still show old data.

```typescript
// [Bad] No revalidation
"use server";

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  // Cache still shows old data!
}
```

**Impact**

- Stale data displayed to users
- Confusing user experience
- Appears as if action didn't work

**Solution**

Use `revalidatePath()` or `revalidateTag()` inside the Server Action to purge the cache.

```typescript
// [Good] Revalidate cache
"use server";

import { revalidatePath } from "next/cache";

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });

  revalidatePath("/products"); // Refresh products page
}

// [Good] With redirect
("use server");

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;

  await db.product.create({ data: { name } });

  revalidatePath("/products");
  redirect("/products"); // Navigate to products page
}

// [Good] Revalidate by tag
("use server");

import { revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });

  revalidateTag("products"); // Revalidate all fetches tagged with "products"
}
```

---

### Thinking Server Actions Only Work in Server Components

**The Mistake**

Server Actions can be imported and triggered in Client Components as well (e.g., inside an `onClick` handler), not just in forms.

```typescript
// [Bad] Misconception that Server Actions can't be used in Client Components
"use client";

export function DeleteButton({ productId }: { productId: string }) {
  async function handleDelete() {
    // Thinking this won't work in Client Component
    await fetch("/api/delete-product", {
      method: "POST",
      body: JSON.stringify({ id: productId }),
    });
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```

**Impact**

- Creating unnecessary API routes
- Missing Progressive Enhancement
- More complex code

**Solution**

Import and use Server Actions directly in Client Components.

```typescript
// [Good] Server Action in Client Component
// actions/product.ts
"use server";

export async function deleteProduct(productId: string) {
  await db.product.delete({ where: { id: productId } });
  revalidatePath("/products");
}

// components/DeleteButton.tsx
("use client");

import { deleteProduct } from "@/actions/product";

export function DeleteButton({ productId }: { productId: string }) {
  async function handleDelete() {
    await deleteProduct(productId); // Works in Client Component!
  }

  return <button onClick={handleDelete}>Delete</button>;
}

// [Good] With loading state
("use client");

import { useState, useTransition } from "react";
import { deleteProduct } from "@/actions/product";

export function DeleteButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId);
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

---

### Forgetting to Validate and Protect Server Actions

**The Mistake**

Server Actions are public POST endpoints. Treating them as internal functions is dangerous. Always validate inputs and check authentication/authorization inside the action.

```typescript
// [Bad] No validation or auth check
"use server";

export async function deleteProduct(productId: string) {
  // Anyone can call this!
  await db.product.delete({ where: { id: productId } });
}

// [Bad] No input validation
("use server");

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;

  // What if name is empty? Or contains malicious content?
  await db.product.create({ data: { name } });
}
```

**Impact**

- **Critical security vulnerability**
- Unauthorized data access/modification
- Data corruption from invalid inputs
- Potential SQL injection or XSS attacks

**Solution**

Always validate inputs (using tools like Zod) and check authentication/authorization inside the action.

```typescript
// [Good] Validated and protected Server Action
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const productSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  description: z.string().max(500),
});

export async function createProduct(formData: FormData) {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // 2. Authorize
  if (session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  // 3. Validate input
  const rawData = {
    name: formData.get("name"),
    price: Number(formData.get("price")),
    description: formData.get("description"),
  };

  const validatedData = productSchema.parse(rawData);

  // 4. Execute action
  await db.product.create({
    data: {
      ...validatedData,
      createdBy: session.user.id,
    },
  });

  revalidatePath("/products");
}

// [Good] With error handling
export async function deleteProduct(productId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (
      product.createdBy !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return { error: "Forbidden" };
    }

    await db.product.delete({ where: { id: productId } });
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete product" };
  }
}
```

---

### Using `use server` to Limit Code to Server

**The Mistake**

Using `use server` on a utility function creates a public endpoint (Server Action), which might not be intended. To strictly prevent code from running on the client, use the `server-only` package.

```typescript
// [Bad] Using "use server" for server-only utilities
"use server";

export function getSecretKey() {
  return process.env.SECRET_KEY; // Now a public endpoint!
}
```

**Impact**

- Creates unintended public endpoints
- Security vulnerabilities
- Exposes internal utilities

**Solution**

Use the `server-only` package to throw a build-time error if server utilities are imported into client files.

```typescript
// [Good] Use server-only package
// lib/secrets.ts
import "server-only";

export function getSecretKey() {
  return process.env.SECRET_KEY;
}

export async function hashPassword(password: string) {
  // Server-only utility
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(password, 10);
}

// If imported in Client Component, build fails with clear error message
```

```bash
# Install server-only
npm install server-only
```

---

### Sending Too Much Data to the Client

**The Mistake**

Passing raw, large datasets (e.g., from a CMS) directly to Client Components. Even if the UI doesn't display all fields, the browser must still download and parse the entire JSON payload.

```typescript
// [Bad] Sending entire CMS response to client
// Server Component
async function ProductPage() {
  const product = await cms.getProduct(id); // Returns 50+ fields

  return <ProductDetails product={product} />; // All 50 fields sent to client
}

// Client Component - only uses 5 fields
("use client");

function ProductDetails({ product }: { product: CMSProduct }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </div>
  );
}
```

**Impact**

Increased payload size slows down:

- **FCP** — More data to download before first paint
- **LCP** — Content blocked on large payload parsing
- **Hydration** — More data to serialize and deserialize

**Solution**

Filter, map, and transform data on the server (using Server Components or Route Handlers). Send only the minimal Data Transfer Object (DTO) required by the UI.

```typescript
// [Good] Server filters data, client receives minimal DTO
// types/product.ts
interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

// Server Component - transforms data
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await cms.getProduct(params.id);

  // Only send what the client needs
  const productDTO: ProductDTO = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.images[0]?.url ?? "/placeholder.jpg",
  };

  return <ProductDetails product={productDTO} />;
}

// Client Component - receives minimal data
("use client");

function ProductDetails({ product }: { product: ProductDTO }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </div>
  );
}
```

---

## Routing & Parameters

### Misunderstanding Dynamic Routes vs. Search Params

**The Mistake**

Dynamic Routes use `[id]` in the filename and provide `params`. Query strings (e.g., `?color=red`) are accessed via `searchParams`. These are only available as props in Page components, not in other components.

```typescript
// [Bad] Confusion between params and searchParams
// app/products/[id]/page.tsx
export default function ProductPage({
  params, // From [id] in filename
  searchParams, // From ?query in URL
}: {
  params: { id: string };
  searchParams: { color?: string };
}) {
  // This is correct for Page components
  return (
    <div>
      Product {params.id} in {searchParams.color}
    </div>
  );
}

// [Bad] Trying to access in regular component
function ProductInfo({ params }: { params: { id: string } }) {
  // params won't be available here!
  return <div>Product {params.id}</div>;
}
```

**Impact**

- Confusion about routing system
- Runtime errors
- Incorrect data access

**Solution**

Understand that `params` and `searchParams` are only available in Page components. Pass them down as props or use client-side hooks.

```typescript
// [Good] Using params in Page component
// app/products/[id]/page.tsx
export default function ProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { color?: string; size?: string };
}) {
  return (
    <div>
      <ProductInfo productId={params.id} />
      <ProductFilters color={searchParams.color} size={searchParams.size} />
    </div>
  );
}

// [Good] Pass as props to child components
function ProductInfo({ productId }: { productId: string }) {
  return <div>Product {productId}</div>;
}
```

---

### Incorrectly Working with Search Params

**The Mistake**

Reading `searchParams` via props forces a network request to the server on every URL change (because the Page is a Server Component). If you need instant UI updates without a network round-trip when query params change, use the `useSearchParams` hook in a Client Component.

```typescript
// [Bad] Server Component re-renders on every param change
// app/products/page.tsx
export default function ProductsPage({
  searchParams,
}: {
  searchParams: { filter?: string; sort?: string };
}) {
  // Every filter change triggers server request
  const products = await getProducts(searchParams);

  return (
    <div>
      <FilterUI />
      <ProductList products={products} />
    </div>
  );
}
```

**Impact**

- Network latency on every filter change
- Poor user experience with slow updates
- Increased server load

**Solution**

For instant UI updates, use `useSearchParams` hook in a Client Component.

```typescript
// [Good] Client Component for instant updates
"use client";

import { useSearchParams, useRouter } from "next/navigation";

export function FilterUI() {
  const searchParams = useSearchParams();
  const router = useRouter();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div>
      <select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => updateFilter("category", e.target.value)}
      >
        <option value="">All</option>
        <option value="electronics">Electronics</option>
      </select>
    </div>
  );
}

// [Good] Server Component for data fetching
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const products = await getProducts(searchParams);

  return (
    <div>
      <FilterUI />
      <ProductList products={products} />
    </div>
  );
}
```

---

## Performance, Loading & Rendering

### CSS-in-JS Runtime Overhead

### The Mistake

Using libraries like Styled Components that rely on JavaScript runtime to hash class names and inject styles into the DOM.

```typescript
// [Bad] Runtime CSS-in-JS
import styled from "styled-components";

const Button = styled.button`
  background: blue;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;

  &:hover {
    background: darkblue;
  }
`;

export function Hero() {
  return <Button>Click Me</Button>;
}
```

### Impact

Every style injection triggers a browser style recalculation for the entire page. This significantly hurts:

- **LCP (Largest Contentful Paint)** — Delayed rendering of main content
- **FCP (First Contentful Paint)** — Slower initial paint
- **INP (Interaction to Next Paint)** — Poor responsiveness during interactions

### Solution

Switch to zero-runtime solutions like Tailwind CSS, which compiles a single CSS file at build time without client-side overhead.

```typescript
// [Good] Zero-runtime with Tailwind CSS
export function Hero() {
  return (
    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
      Click Me
    </button>
  );
}
```

---

## CSS Modules with Lazy-Loaded Components

### The Mistake

Combining CSS Modules with lazy-loaded components. When a component loads dynamically (e.g., upon user interaction), its specific styles are injected on demand.

```typescript
// [Bad] CSS Modules + Dynamic Import
import dynamic from "next/dynamic";

// Styles injected when modal opens, causing recalculation
const Modal = dynamic(() => import("./Modal"), {
  loading: () => <p>Loading...</p>,
});

export function Page() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
    </>
  );
}

// Modal.module.css styles injected on-demand
```

### Impact

Style injection causes a full-page style recalculation exactly when the user is trying to interact (e.g., clicking a button), leading to:

- **High input delay** — User clicks feel sluggish
- **Poor INP scores** — Interaction responsiveness suffers

### Solution

Use utility-first CSS (like Tailwind) where styles are loaded upfront, preventing recalculation delays during interaction.

```typescript
// [Good] Utility CSS loaded upfront
import dynamic from "next/dynamic";

const Modal = dynamic(() => import("./Modal"), {
  loading: () => <p className="text-gray-500">Loading...</p>,
});

// Modal.tsx uses Tailwind classes (already in global CSS bundle)
export function Modal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Modal Title</h2>
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

---

## Missing Dynamic Imports

### The Mistake

Including heavy components (like modals, dialogs, or charts) in the initial JavaScript bundle even though they are not visible on load.

```typescript
// [Bad] Modal included in initial bundle
import { useState } from "react";
import HeavyModal from "@/components/HeavyModal"; // Imported regardless of usage

export function ProductPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ProductDetails />
      <button onClick={() => setShowModal(true)}>Quick View</button>
      {showModal && <HeavyModal />}
    </>
  );
}
```

### Impact

Large bundle sizes slow down parsing and compilation, which degrades:

- **LCP** — Main content renders later
- **FCP** — Initial paint is delayed
- **TTI (Time to Interactive)** — Page takes longer to become usable

### Solution

Use `next/dynamic` to lazy load components only when they are needed.

```typescript
// [Good] Dynamic import - loaded only when needed
import { useState } from "react";
import dynamic from "next/dynamic";

const HeavyModal = dynamic(() => import("@/components/HeavyModal"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
  ssr: false, // Skip server rendering for client-only components
});

export function ProductPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <ProductDetails />
      <button onClick={() => setShowModal(true)}>Quick View</button>
      {showModal && <HeavyModal />}
    </>
  );
}
```

---

## Using Third-Party Font CDNs

### The Mistake

Loading fonts from external CDNs (like Google Fonts). This creates a request chain: DNS lookup → CSS request → Font file request.

```typescript
// [Bad] External font CDN in layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Extra DNS lookup + request chain */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Impact

Even on fast networks, the extra round trips add latency and can cause:

- **FOUT (Flash of Unstyled Text)** — Text appears in fallback font, then shifts
- **Increased LCP** — Font-dependent content renders later
- **Layout shifts** — CLS impact when fonts swap

### Solution

Use `next/font`. It automatically hosts fonts on your same domain (eliminating DNS lookups), subsets characters, controls weights, and preloads the font files.

```typescript
// [Good] Self-hosted with next/font
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

```typescript
// [Good] Local fonts for maximum control
import localFont from "next/font/local";

const customFont = localFont({
  src: [
    { path: "./fonts/Custom-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Custom-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-custom",
});
```

---

## Not Using next/image Correctly

### The Mistake

Using standard `<img>` tags, which miss out on automatic lazy loading, WebP conversion, and responsive sizing. A related mistake is failing to use the `priority` prop for LCP elements (like hero images or logos).

```typescript
// [Bad] Standard img tag
export function Hero() {
  return (
    <section>
      {/* No lazy loading, no optimization, no responsive sizing */}
      <img src="/hero-image.jpg" alt="Hero" />
      <img src="/logo.png" alt="Company Logo" />
    </section>
  );
}

// [Bad] Missing priority on LCP image
import Image from "next/image";

export function Hero() {
  return (
    <section>
      {/* Hero image loads lazily by default - bad for LCP */}
      <Image src="/hero-image.jpg" alt="Hero" width={1200} height={600} />
    </section>
  );
}
```

### Impact

- **Mobile devices download desktop-sized images** — Wasted bandwidth
- **LCP elements load too slowly** — Browser doesn't prioritize them
- **No format optimization** — Missing WebP/AVIF conversion

### Solution

Use `next/image` for all images. Explicitly mark above-the-fold images (Hero, Logo) with `priority` to bypass lazy loading.

```typescript
// [Good] Optimized images with proper priority
import Image from "next/image";

export function Hero() {
  return (
    <section>
      {/* Hero image: priority for LCP */}
      <Image
        src="/hero-image.jpg"
        alt="Hero banner showcasing our product"
        width={1200}
        height={600}
        priority // Preloads for LCP
        sizes="100vw"
        className="w-full h-auto"
      />

      {/* Logo: priority because it's above the fold */}
      <Image
        src="/logo.png"
        alt="Company Logo"
        width={150}
        height={50}
        priority
      />

      {/* Below-fold images: lazy loaded (default) */}
      <Image
        src="/feature-1.jpg"
        alt="Feature one"
        width={400}
        height={300}
        sizes="(max-width: 768px) 100vw, 400px"
      />
    </section>
  );
}
```

---

## Unoptimized Third-Party Scripts

### The Mistake

Allowing third-party scripts (analytics, widgets) to load by default, which blocks the main thread during critical rendering.

```typescript
// [Bad] Uncontrolled script loading
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Blocks main thread during critical render */}
        <script src="https://analytics.example.com/script.js" />
        <script src="https://chat-widget.example.com/widget.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Impact

- **High Total Blocking Time (TBT)** — Main thread blocked
- **Poor INP** — Browser treats third-party scripts as equally important
- **Delayed interactivity** — User can't interact until scripts finish

### Solution

Use the `next/script` component to control loading strategies:

- `beforeInteractive` — Critical polyfills only
- `afterInteractive` — Analytics (default)
- `lazyOnload` — Non-critical chat widgets or social embeds

```typescript
// [Good] Controlled script loading with next/script
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Analytics: loads after page is interactive */}
        <Script
          src="https://analytics.example.com/script.js"
          strategy="afterInteractive"
        />

        {/* Chat widget: loads during idle time */}
        <Script
          src="https://chat-widget.example.com/widget.js"
          strategy="lazyOnload"
        />

        {/* Critical polyfill: loads before hydration */}
        <Script
          src="/polyfills/intersection-observer.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
```

```typescript
// [Good] Inline scripts with proper strategy
<Script
  id="google-analytics"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID');
    `,
  }}
/>
```

---

## Skipping the React Compiler

### The Mistake

Failing to enable the stable React Compiler, relying instead on manual memoization (which is prone to human error).

```typescript
// [Bad] Manual memoization - error-prone and verbose
import { memo, useMemo, useCallback } from "react";

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  // Easy to forget dependencies or memoize incorrectly
  const formattedPrice = useMemo(
    () => formatCurrency(product.price),
    [product.price]
  );

  const handleClick = useCallback(() => {
    onAddToCart(product.id);
  }, [onAddToCart, product.id]);

  return (
    <div>
      <h3>{product.name}</h3>
      <p>{formattedPrice}</p>
      <button onClick={handleClick}>Add to Cart</button>
    </div>
  );
});
```

### Impact

You miss out on an average **~15% performance improvement** caused by automatic memoization and object hoisting.

### Solution

Enable the React Compiler in `next.config.js`. It optimizes code at build time with no manual refactoring required.

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

```typescript
// [Good] Clean code - React Compiler handles optimization
function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formattedPrice = formatCurrency(product.price);

  return (
    <div>
      <h3>{product.name}</h3>
      <p>{formattedPrice}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
}
```

---

## Sending Too Much Data to the Client

### The Mistake

Passing raw, large datasets (e.g., from a CMS) directly to Client Components. Even if the UI doesn't display all fields, the browser must still download and parse the entire JSON payload.

```typescript
// [Bad] Sending entire CMS response to client
// Server Component
async function ProductPage() {
  const product = await cms.getProduct(id); // Returns 50+ fields

  return <ProductDetails product={product} />; // All 50 fields sent to client
}

// Client Component - only uses 5 fields
("use client");

function ProductDetails({ product }: { product: CMSProduct }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </div>
  );
}
```

### Impact

Increased payload size slows down:

- **FCP** — More data to download before first paint
- **LCP** — Content blocked on large payload parsing
- **Hydration** — More data to serialize and deserialize

### Solution

Filter, map, and transform data on the server (using Server Components or Route Handlers). Send only the minimal Data Transfer Object (DTO) required by the UI.

```typescript
// [Good] Server filters data, client receives minimal DTO
// types/product.ts
interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

// Server Component - transforms data
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await cms.getProduct(params.id);

  // Only send what the client needs
  const productDTO: ProductDTO = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.images[0]?.url ?? "/placeholder.jpg",
  };

  return <ProductDetails product={productDTO} />;
}

// Client Component - receives minimal data
("use client");

function ProductDetails({ product }: { product: ProductDTO }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </div>
  );
}
```

---

## Excessive Client-Side Logic

### The Mistake

Performing heavy filtering, sorting, or data transformation logic on the client side.

```typescript
// [Bad] Heavy computation on client
"use client";

import { useState, useMemo } from "react";

function ProductList({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  // Heavy computation runs on every render
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.category === filters.category)
      .filter((p) => p.price >= filters.minPrice && p.price <= filters.maxPrice)
      .filter((p) => p.rating >= filters.minRating)
      .sort((a, b) => {
        if (filters.sortBy === "price") return a.price - b.price;
        if (filters.sortBy === "rating") return b.rating - a.rating;
        return a.name.localeCompare(b.name);
      })
      .slice(0, filters.limit);
  }, [products, filters]);

  return <Grid products={filteredProducts} />;
}
```

### Impact

- **Increased memory usage** — Large datasets held in browser memory
- **Main-thread blocking** — Filtering/sorting blocks interactions
- **Poor INP** — Interface becomes sluggish during computation

### Solution

Shift computation to Server Components. Use the client only for interactivity, treating Client Components as a rendering layer rather than a data processor.

```typescript
// [Good] Server handles computation
// app/products/page.tsx (Server Component)
interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
}

async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  // Filter and sort on server
  const products = await getFilteredProducts({
    category: searchParams.category,
    minPrice: Number(searchParams.minPrice) || 0,
    maxPrice: Number(searchParams.maxPrice) || Infinity,
    sortBy: searchParams.sortBy || "name",
  });

  return (
    <>
      <FilterControls currentFilters={searchParams} />
      <ProductGrid products={products} />
    </>
  );
}

// Client Component - only handles UI interaction
("use client");

import { useRouter, useSearchParams } from "next/navigation";

function FilterControls({ currentFilters }: { currentFilters: SearchParams }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex gap-4">
      <select
        value={currentFilters.category ?? ""}
        onChange={(e) => updateFilter("category", e.target.value)}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
      {/* More filter controls */}
    </div>
  );
}
```

---

## Heavy Middleware Logic

### The Mistake

Putting heavy logic, large libraries (like `moment.js` or `lodash`), or non-tree-shaken dependencies inside Middleware.

```typescript
// [Bad] Heavy middleware
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import moment from "moment"; // 300KB+ library
import _ from "lodash"; // Another large library

export function middleware(request: NextRequest) {
  // Heavy date parsing on every request
  const lastVisit = request.cookies.get("lastVisit")?.value;
  const daysSinceVisit = moment().diff(moment(lastVisit), "days");

  // Complex object manipulation
  const userData = _.merge(
    { default: true },
    JSON.parse(request.cookies.get("userData")?.value ?? "{}")
  );

  // Runs on EVERY request including static assets
  return NextResponse.next();
}

// No matcher - runs on everything
```

### Impact

Middleware runs on **every** request. Any latency here directly increases:

- **TTFB (Time to First Byte)** — Every request is delayed
- **LCP** — Main content waits for middleware
- **FCP** — First paint blocked by slow middleware

### Solution

Keep Middleware lightweight. Use native JavaScript methods, lightweight libraries (e.g., `date-fns`), and use `matcher` config to exclude static assets from middleware execution.

```typescript
// [Good] Lightweight middleware
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Use native Date instead of moment
  const lastVisit = request.cookies.get("lastVisit")?.value;
  const daysSinceVisit = lastVisit
    ? Math.floor(
        (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Simple object spread instead of lodash
  const defaultData = { theme: "light", locale: "en" };
  const cookieData = JSON.parse(request.cookies.get("userData")?.value ?? "{}");
  const userData = { ...defaultData, ...cookieData };

  const response = NextResponse.next();

  // Set headers if needed
  response.headers.set("x-days-since-visit", String(daysSinceVisit ?? 0));

  return response;
}

// Exclude static assets and API routes that don't need middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need middleware
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/health).*)",
  ],
};
```

---

### Forgetting Loading States

**The Mistake**

Since local development is fast, developers forget that production requests take time. Users see blank pages while data loads.

```typescript
// [Bad] No loading state
export default async function ProductsPage() {
  const products = await getProducts(); // Takes 2 seconds

  return <ProductList products={products} />;
}
```

**Impact**

- Blank white screen during data fetch
- Poor **LCP** and **FCP**
- Confusing user experience

**Solution**

Use a `loading.tsx` file to automatically wrap the page in Suspense and show a fallback UI.

```typescript
// [Good] Add loading.tsx
// app/products/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 animate-pulse rounded" />
      <div className="h-8 bg-gray-200 animate-pulse rounded" />
      <div className="h-8 bg-gray-200 animate-pulse rounded" />
    </div>
  );
}

// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductList products={products} />;
}
```

---

### Not Being Granular with Suspense Boundaries

**The Mistake**

Using `loading.tsx` blocks the entire page. Static parts of the page (like headers/footers) also wait for data.

```typescript
// [Bad] Entire page waits
// app/products/loading.tsx shows while everything loads
export default async function ProductsPage() {
  const products = await getProducts(); // Slow

  return (
    <div>
      <Header /> {/* Could show immediately */}
      <ProductList products={products} />
      <Footer /> {/* Could show immediately */}
    </div>
  );
}
```

**Impact**

- Unnecessary waiting for static content
- Poor perceived performance
- Worse **LCP**

**Solution**

Wrap specific components in `<Suspense>` boundaries. This allows static parts to load immediately.

```typescript
// [Good] Granular suspense boundaries
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <div>
      <Header /> {/* Shows immediately */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList /> {/* Loads async */}
      </Suspense>
      <Footer /> {/* Shows immediately */}
    </div>
  );
}

async function ProductList() {
  const products = await getProducts();
  return <div>{/* Render products */}</div>;
}

function ProductListSkeleton() {
  return <div className="animate-pulse">{/* Skeleton */}</div>;
}
```

---

### Putting Suspense in the Wrong Place

**The Mistake**

Placing `<Suspense>` _inside_ the component that is doing the async fetching won't work. The boundary must wrap the component _from the outside_ (in the parent).

```typescript
// [Bad] Suspense inside async component
async function ProductList() {
  return (
    <Suspense fallback={<Loading />}>
      {/* This doesn't work */}
      {await getProducts()}
    </Suspense>
  );
}
```

**Impact**

- Suspense doesn't work as expected
- No loading state shown
- Confusion about React behavior

**Solution**

Wrap the async component from the parent.

```typescript
// [Good] Suspense wraps from outside
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductList />
    </Suspense>
  );
}

async function ProductList() {
  const products = await getProducts();
  return <div>{/* Render */}</div>;
}
```

---

### Forgetting the `key` Prop for Suspense

**The Mistake**

Suspense boundaries do not automatically re-trigger when URL search parameters change. The fallback won't show again.

```typescript
// [Bad] Suspense doesn't re-trigger on param change
export default function SearchPage({
  searchParams,
}: {
  searchParams: { query?: string };
}) {
  return (
    <Suspense fallback={<Loading />}>
      <SearchResults query={searchParams.query} />
    </Suspense>
  );
}
```

**Impact**

- No loading state when query changes
- Stale results shown
- Poor user experience

**Solution**

Add `key={searchParams.query}` to the Suspense component to tell React to re-render the fallback.

```typescript
// [Good] Key prop forces re-render
export default function SearchPage({
  searchParams,
}: {
  searchParams: { query?: string };
}) {
  return (
    <Suspense key={searchParams.query} fallback={<Loading />}>
      <SearchResults query={searchParams.query} />
    </Suspense>
  );
}

async function SearchResults({ query }: { query?: string }) {
  const results = await searchProducts(query);
  return <div>{/* Render results */}</div>;
}
```

---

### Accidentally Making a Page Dynamic

**The Mistake**

Using dynamic APIs like `cookies()`, `headers()`, or `searchParams` in a page (or a layout wrapping the page) opts the route out of Static Rendering (SSG) and into Dynamic Rendering (SSR), which is slower.

```typescript
// [Bad] Entire page becomes dynamic
import { cookies } from "next/headers";

export default async function Page() {
  const theme = cookies().get("theme"); // Makes entire page dynamic!

  return (
    <div>
      <StaticContent /> {/* Could be static */}
      <UserPreferences theme={theme} />
    </div>
  );
}
```

**Impact**

- Loses static generation benefits
- Slower **TTFB**
- Increased server load
- Can't use CDN caching

**Solution**

Isolate dynamic logic to specific components or use middleware for dynamic data.

```typescript
// [Good] Keep page static, move dynamic to component
export default function Page() {
  return (
    <div>
      <StaticContent />
      <DynamicUserPreferences /> {/* Dynamic in Client Component */}
    </div>
  );
}

// [Good] Use Client Component for dynamic access
("use client");

import { useEffect, useState } from "react";

function DynamicUserPreferences() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const cookieTheme = document.cookie
      .split("; ")
      .find((row) => row.startsWith("theme="))
      ?.split("=")[1];
    setTheme(cookieTheme ?? "light");
  }, []);

  return <div>Theme: {theme}</div>;
}

// [Good] Explicitly opt-in to dynamic rendering when needed
export const dynamic = "force-dynamic";

export default async function DynamicPage() {
  const session = await auth();
  return <div>Welcome {session.user.name}</div>;
}
```

---

## Security & Utilities

### Hardcoding Secrets in Components

**The Mistake**

Storing API keys in code variables works on the server, but if that component is ever imported into a Client Component, the secrets will leak to the browser.

```typescript
// [Bad] Hardcoded secret
const API_KEY = "sk_live_12345"; // Leaks if imported in Client Component

export async function getUser() {
  const res = await fetch("https://api.example.com/user", {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return res.json();
}
```

**Impact**

- **Critical security vulnerability**
- API keys exposed in browser
- Potential account compromise
- Unauthorized API usage

**Solution**

Use environment variables. Variables without `NEXT_PUBLIC_` are stripped from client bundles.

```typescript
// [Good] Environment variables
// .env.local
API_KEY=sk_live_12345
NEXT_PUBLIC_API_URL=https://api.example.com

// lib/api.ts
export async function getUser() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}` // Server-only
    },
  });
  return res.json();
}

// [Good] Use server-only package
import "server-only";

const API_KEY = process.env.API_KEY!;

export async function getUser() {
  // Safe - can't be imported in Client Components
  const res = await fetch("https://api.example.com/user", {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return res.json();
}
```

---

### Not Separating Client and Server Utilities

**The Mistake**

If you use a utility function on the client that relies on private environment variables, it will fail silently or return undefined.

```typescript
// [Bad] Mixed utilities
// lib/utils.ts
export function getApiUrl() {
  return process.env.API_URL; // undefined on client!
}

export function formatDate(date: Date) {
  return date.toLocaleDateString();
}

// Both functions in same file - client can't use getApiUrl
```

**Impact**

- Runtime errors or undefined values
- Difficult to debug
- Unclear boundaries between server and client code

**Solution**

Use the `server-only` package to throw a build-time error if server utilities are imported into client files.

```typescript
// [Good] Separate utilities
// lib/server-utils.ts
import "server-only";

export function getApiUrl() {
  return process.env.API_URL!;
}

export async function hashPassword(password: string) {
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(password, 10);
}

// lib/client-utils.ts
export function formatDate(date: Date) {
  return date.toLocaleDateString();
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}
```

```bash
# Install server-only
npm install server-only
```

---

### Using `redirect()` Inside try/catch

**The Mistake**

The `redirect()` function works by throwing a specific error. If you use it inside a `try` block, the `catch` block will catch the redirect error and stop the redirection from happening.

```typescript
// [Bad] redirect() caught by try/catch
"use server";

import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    await db.product.create({ data: { name } });

    redirect("/products"); // Throws error, gets caught!
  } catch (error) {
    console.error(error); // Catches redirect error!
    return { error: "Failed" };
  }
}
```

**Impact**

- Redirects don't work
- Confusing debugging experience
- Unexpected behavior

**Solution**

Call `redirect()` _after_ the `try/catch` block.

```typescript
// [Good] redirect() after try/catch
"use server";

import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    await db.product.create({ data: { name } });
  } catch (error) {
    console.error(error);
    return { error: "Failed to create product" };
  }

  redirect("/products"); // Called after try/catch
}

// [Good] Alternative with early return
export async function createProduct(formData: FormData) {
  let success = false;

  try {
    const name = formData.get("name") as string;
    await db.product.create({ data: { name } });
    success = true;
  } catch (error) {
    console.error(error);
    return { error: "Failed to create product" };
  }

  if (success) {
    redirect("/products");
  }
}
```

---

## Quick Reference

### Server & Client Architecture

| Mistake                               | Impact               | Solution                           |
| ------------------------------------- | -------------------- | ---------------------------------- |
| `use client` too high                 | Large bundles        | Move to component leaves           |
| Not refactoring for client            | Entire page client   | Extract interactive components     |
| Missing `use client`                  | Inconsistent errors  | Add explicit directive             |
| Wrapping Server Components            | Confusion            | Pass as `children`                 |
| State on server                       | Runtime errors       | Use Client Components              |
| Wrong `use server` usage              | Unintended endpoints | Use only for Server Actions        |
| Leaking sensitive data                | Security risk        | Filter data on server              |
| Client Components only run in browser | Errors               | Use `useEffect` for browser APIs   |
| Browser APIs incorrectly              | SSR errors           | Check `typeof window`              |
| Hydration errors                      | UI mismatches        | Consistent server/client rendering |
| Third-party components                | Build errors         | Wrap with `use client`             |

### Data Fetching & Mutations

| Mistake                       | Impact               | Solution                            |
| ----------------------------- | -------------------- | ----------------------------------- |
| Unnecessary Route Handlers    | Extra latency        | Fetch directly in Server Components |
| Fearing duplicate fetches     | Prop drilling        | Trust automatic deduplication       |
| Sequential fetching           | Slow loads           | Use `Promise.all()`                 |
| Manual form submissions       | More boilerplate     | Use Server Actions                  |
| Stale data after mutation     | Confusing UX         | Use `revalidatePath()`              |
| Server Actions only in Server | Extra API routes     | Use in Client Components too        |
| Unprotected Server Actions    | Security risk        | Validate and authenticate           |
| `use server` for utilities    | Unintended endpoints | Use `server-only` package           |
| Too much client data          | Large payloads       | Send minimal DTOs                   |

### Performance & Rendering

| Mistake                   | Impact              | Solution                     |
| ------------------------- | ------------------- | ---------------------------- |
| CSS-in-JS Runtime         | LCP, FCP, INP       | Use Tailwind CSS             |
| CSS Modules + Lazy Load   | INP                 | Utility-first CSS            |
| No Dynamic Imports        | LCP, FCP            | Use `next/dynamic`           |
| Third-Party Font CDNs     | LCP, FOUT           | Use `next/font`              |
| Wrong `next/image` Usage  | LCP                 | Use `priority` prop          |
| Unoptimized Scripts       | TBT, INP            | Use `next/script` strategies |
| No React Compiler         | ~15% perf loss      | Enable in config             |
| Client-Side Logic         | INP, Memory         | Server Components            |
| Heavy Middleware          | TTFB, LCP, FCP      | Native JS + matcher          |
| No loading states         | Blank screens       | Add `loading.tsx`            |
| Non-granular Suspense     | Poor perceived perf | Wrap specific components     |
| Wrong Suspense placement  | Doesn't work        | Wrap from parent             |
| Missing Suspense key      | No re-trigger       | Add `key` prop               |
| Accidental dynamic render | Slow TTFB           | Isolate dynamic logic        |

### Routing & Parameters

| Mistake                       | Impact          | Solution                             |
| ----------------------------- | --------------- | ------------------------------------ |
| Confusing params/searchParams | Runtime errors  | Understand Page component props      |
| Server-side searchParams      | Network latency | Use `useSearchParams` for instant UI |

### Security & Utilities

| Mistake                   | Impact           | Solution                  |
| ------------------------- | ---------------- | ------------------------- |
| Hardcoded secrets         | Security risk    | Use environment variables |
| Mixed server/client utils | Undefined values | Use `server-only` package |
| `redirect()` in try/catch | Redirects fail   | Call after try/catch      |

---

## Core Web Vitals Reference

| Metric   | Full Name                 | Measures             | Good Threshold |
| -------- | ------------------------- | -------------------- | -------------- |
| **LCP**  | Largest Contentful Paint  | Loading performance  | < 2.5s         |
| **INP**  | Interaction to Next Paint | Responsiveness       | < 200ms        |
| **FCP**  | First Contentful Paint    | Initial render       | < 1.8s         |
| **CLS**  | Cumulative Layout Shift   | Visual stability     | < 0.1          |
| **TTFB** | Time to First Byte        | Server response      | < 800ms        |
| **TBT**  | Total Blocking Time       | Main thread blocking | < 200ms        |

---

## Summary

This comprehensive guide covers 39 common mistakes in Next.js development across five major categories:

1. **Server & Client Component Architecture (11)** - Understanding and properly implementing the boundaries between server and client code
2. **Data Fetching & Mutations (9)** - Efficient data loading, caching, and mutation patterns
3. **Routing & Parameters (2)** - Correctly handling dynamic routes and search parameters
4. **Performance, Loading & Rendering (14)** - Optimizing bundle size, loading states, and rendering strategies
5. **Security & Utilities (3)** - Protecting sensitive data and properly organizing code

Each mistake includes:

- Clear explanation of the problem
- Impact on performance and user experience
- Practical code examples (bad vs. good)
- Recommended solutions

By avoiding these pitfalls, you'll build faster, more secure, and more maintainable Next.js applications with better Core Web Vitals scores.
