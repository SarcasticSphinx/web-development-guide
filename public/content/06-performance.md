# Performance

Optimize your Next.js applications for speed, efficiency, and excellent user experience. This guide covers function optimization, React patterns, bundle optimization, and monitoring strategies.

---

## Table of Contents

1. [Function Optimization](#function-optimization)
2. [React Performance](#react-performance)
3. [Bundle Optimization](#bundle-optimization)
4. [Next.js Specific Optimization](#nextjs-specific-optimization)
5. [Data Fetching Performance](#data-fetching-performance)
6. [State Management Performance](#state-management-performance)
7. [Memory Management](#memory-management)
8. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Function Optimization

### Keep Functions Under 100 Lines

Smaller functions are easier to optimize by the JavaScript JIT compiler.

```typescript
// [Bad] Monolithic function (200+ lines)
async function processOrder(order: Order) {
  // Validation (30 lines)
  // Price calculation (40 lines)
  // Discount application (30 lines)
  // Inventory check (25 lines)
  // Payment processing (50 lines)
  // Email notification (25 lines)
  // Logging and cleanup (20 lines)
}

// [Good] Decomposed into focused functions
async function processOrder(order: Order): Promise<ProcessedOrder> {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculatePrices(validatedOrder);
  const discountedOrder = applyDiscounts(pricedOrder);

  await checkInventory(discountedOrder);
  const payment = await processPayment(discountedOrder);

  await Promise.all([
    sendConfirmationEmail(discountedOrder, payment),
    updateInventory(discountedOrder),
    logOrderProcessed(discountedOrder),
  ]);

  return { order: discountedOrder, payment };
}
```

### Avoid Nested Function Definitions

Function definitions inside other functions create new function objects on every call.

```typescript
// [Bad] Function recreated on every call
function processItems(items: Item[]) {
  function formatItem(item: Item) {
    return `${item.name}: $${item.price}`;
  }

  return items.map(formatItem);
}

// [Good] Function defined once, outside
function formatItem(item: Item): string {
  return `${item.name}: $${item.price}`;
}

function processItems(items: Item[]): string[] {
  return items.map(formatItem);
}

// [Good] Acceptable: Arrow functions for simple operations
function processItems(items: Item[]): string[] {
  return items.map((item) => `${item.name}: $${item.price}`);
}
```

### Memoize Expensive Calculations

```typescript
// [Good] Memoized function
const memoize = <T, R>(fn: (arg: T) => R): ((arg: T) => R) => {
  const cache = new Map<T, R>();

  return (arg: T) => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
};

const expensiveCalculation = memoize((input: number) => {
  // Complex computation
  return input * 2;
});

// [Good] Using lodash-es for more complex memoization
import memoize from "lodash-es/memoize";

const calculateDiscount = memoize(
  (price: number, percentage: number) => price * (percentage / 100),
  // Custom resolver for cache key
  (price, percentage) => `${price}-${percentage}`
);
```

---

## React Performance

### Proper useMemo and useCallback Usage

Use memoization hooks only when there's a clear benefit.

```typescript
// [Bad] Unnecessary memoization
function UserList({ users }: { users: User[] }) {
  // Primitives don't need memoization
  const count = useMemo(() => users.length, [users]);

  // Simple callbacks don't usually need it
  const handleClick = useCallback(() => {
    console.log("clicked");
  }, []);

  return <div>{count}</div>;
}

// [Good] Memoize expensive calculations
function UserStats({ users }: { users: User[] }) {
  // Expensive computation
  const statistics = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      avgAge: users.reduce((sum, u) => sum + u.age, 0) / users.length,
      byRole: users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [users]);

  return <StatsDisplay stats={statistics} />;
}

// [Good] Memoize callbacks passed to memoized children
function UserList({ users, onSelect }: Props) {
  // Callback passed to React.memo component
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(users.find((u) => u.id === id));
    },
    [users, onSelect]
  );

  return (
    <div>
      {users.map((user) => (
        <MemoizedUserCard key={user.id} user={user} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

### React.memo for Component Memoization

```typescript
// [Good] Memoize components that receive stable props
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
}

const UserCard = memo(function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// [Good] Custom comparison function for complex props
const ExpensiveList = memo(
  function ExpensiveList({ items }: { items: Item[] }) {
    return (
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if item IDs change
    return (
      prevProps.items.length === nextProps.items.length &&
      prevProps.items.every((item, i) => item.id === nextProps.items[i].id)
    );
  }
);
```

### Stable Keys

```typescript
// [Bad] Index as key (causes issues with reordering)
{
  items.map((item, index) => <Item key={index} data={item} />);
}

// [Bad] Random keys (re-renders everything)
{
  items.map((item) => <Item key={Math.random()} data={item} />);
}

// [Good] Stable unique identifier
{
  items.map((item) => <Item key={item.id} data={item} />);
}

// [Good] Composite key when needed
{
  items.map((item) => <Item key={`${item.category}-${item.id}`} data={item} />);
}
```

### Avoid Inline Object and Function Creation

```typescript
// [Bad] New object created every render
function Component() {
  return <ChildComponent style={{ margin: 10, padding: 20 }} />;
}

// [Good] Static style object
const containerStyle = { margin: 10, padding: 20 };

function Component() {
  return <ChildComponent style={containerStyle} />;
}

// [Bad] New function created every render
function Component() {
  return <button onClick={() => doSomething()}>Click</button>;
}

// [Good] Better: Stable function reference (when passed to memoized children)
function Component() {
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <MemoizedButton onClick={handleClick}>Click</MemoizedButton>;
}
```

---

## Bundle Optimization

### Dynamic Imports

```typescript
// [Good] Lazy load heavy components
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR for client-only components
});

const CodeEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    loading: () => <div>Loading editor...</div>,
    ssr: false,
  }
);

// [Good] Route-level code splitting (automatic in Next.js)
// Each page in /app is automatically code-split
```

### Tree Shaking

```typescript
// [Bad] Import entire library
import _ from "lodash";
const sorted = _.sortBy(items, "name");

// [Good] Import only what you need
import sortBy from "lodash-es/sortBy";
const sorted = sortBy(items, "name");

// [Bad] Import all icons
import * as Icons from "lucide-react";
const icon = <Icons.User />;

// [Good] Import specific icons
import { User, Settings, LogOut } from "lucide-react";
const icon = <User />;
```

### Analyze Bundle Size

```typescript
// next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

// Run analysis
// ANALYZE=true npm run build
```

### External Dependencies

```typescript
// next.config.js
module.exports = {
  // Don't bundle large libraries, load from CDN
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = {
        ...config.externals,
        // Load from CDN instead of bundling
        moment: "moment",
      };
    }
    return config;
  },
};
```

---

## Next.js Specific Optimization

### Image Optimization

```typescript
import Image from "next/image";

// [Good] Optimized image with proper sizing
function ProductImage({ product }: { product: Product }) {
  return (
    <Image
      src={product.image}
      alt={product.name}
      width={400}
      height={300}
      // Responsive sizes
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      // Priority for above-the-fold images
      priority={product.featured}
      // Placeholder
      placeholder="blur"
      blurDataURL={product.blurHash}
    />
  );
}

// [Good] Fill container
function HeroImage({ src }: { src: string }) {
  return (
    <div className="relative h-[500px] w-full">
      <Image
        src={src}
        alt="Hero"
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
    </div>
  );
}

// [Good] Lazy loading for below-the-fold images
function GalleryImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={200}
      loading="lazy" // Default behavior
    />
  );
}
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevent FOIT
  variable: "--font-inter",
  preload: true,
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
  preload: false, // Only preload critical fonts
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Script Optimization

```typescript
import Script from "next/script";

// [Good] Load third-party scripts optimally
function Analytics() {
  return (
    <>
      {/* Load after page becomes interactive */}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="afterInteractive"
      />

      {/* Load during browser idle time */}
      <Script src="https://widget.example.com/chat.js" strategy="lazyOnload" />

      {/* Critical script - blocks page load */}
      <Script
        src="https://critical.example.com/polyfill.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
```

---

## Data Fetching Performance

### Parallel Data Fetching

```typescript
// [Bad] Sequential fetching (waterfall)
async function DashboardPage() {
  const users = await getUsers(); // 200ms
  const orders = await getOrders(); // 300ms
  const stats = await getStats(); // 150ms
  // Total: 650ms

  return <Dashboard users={users} orders={orders} stats={stats} />;
}

// [Good] Parallel fetching
async function DashboardPage() {
  const [users, orders, stats] = await Promise.all([
    getUsers(), // 200ms
    getOrders(), // 300ms (runs in parallel)
    getStats(), // 150ms (runs in parallel)
  ]);
  // Total: ~300ms (max of all)

  return <Dashboard users={users} orders={orders} stats={stats} />;
}
```

### Suspense for Progressive Loading

```typescript
import { Suspense } from "react";

// [Good] Progressive loading with Suspense
async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Critical content loads first */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Less critical content streams in */}
      <Suspense fallback={<ChartSkeleton />}>
        <ChartsSection />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}

// Each section fetches its own data
async function StatsSection() {
  const stats = await getStats();
  return <StatsDisplay stats={stats} />;
}
```

### Caching Strategies

```typescript
// [Good] Configure caching appropriately
// Static data - cache indefinitely
async function getStaticContent() {
  const res = await fetch("https://api.example.com/static", {
    next: { revalidate: false }, // Cache forever
  });
  return res.json();
}

// Semi-static data - revalidate periodically
async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // Revalidate hourly
  });
  return res.json();
}

// Dynamic data - no cache
async function getUserCart(userId: string) {
  const res = await fetch(`https://api.example.com/cart/${userId}`, {
    cache: "no-store",
  });
  return res.json();
}

// Tag-based revalidation
async function getProductsByCategory(category: string) {
  const res = await fetch(
    `https://api.example.com/products?category=${category}`,
    {
      next: { tags: ["products", `category-${category}`] },
    }
  );
  return res.json();
}

// Revalidate when data changes
import { revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidateTag("products");
}
```

---

## State Management Performance

### Avoid Prop Drilling with Context

```typescript
// [Bad] Prop drilling through many levels
function App() {
  const [user, setUser] = useState<User>(null);
  return (
    <Layout user={user}>
      <Sidebar user={user}>
        <NavItem user={user}>
          <UserAvatar user={user} />
        </NavItem>
      </Sidebar>
    </Layout>
  );
}

// [Good] Context for global state
const UserContext = createContext<User | null>(null);

function App() {
  const [user, setUser] = useState<User>(null);
  return (
    <UserContext.Provider value={user}>
      <Layout>
        <Sidebar>
          <NavItem>
            <UserAvatar />
          </NavItem>
        </Sidebar>
      </Layout>
    </UserContext.Provider>
  );
}

function UserAvatar() {
  const user = useContext(UserContext);
  return <img src={user?.avatar} alt={user?.name} />;
}
```

### Split Contexts to Prevent Unnecessary Re-renders

```typescript
// [Bad] Single context with all state
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

// Components only re-render when their specific context changes
function UserMenu() {
  const user = useContext(UserContext); // Only re-renders on user change
  return <div>{user?.name}</div>;
}

function ThemeToggle() {
  const theme = useContext(ThemeContext); // Only re-renders on theme change
  return <button>{theme}</button>;
}
```

### Zustand for Client State

```typescript
// [Good] Zustand for efficient client state
import { create } from "zustand";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCart: () => set({ items: [] }),
}));

// [Good] Select only needed state to prevent re-renders
function CartCount() {
  // Only re-renders when items.length changes
  const count = useCartStore((state) => state.items.length);
  return <span>{count}</span>;
}

function CartTotal() {
  // Only re-renders when total changes
  const total = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price, 0)
  );
  return <span>${total}</span>;
}
```

---

## Memory Management

### Cleanup in useEffect

```typescript
// [Good] Always cleanup subscriptions and listeners
function useEventListener(event: string, handler: EventListener) {
  useEffect(() => {
    window.addEventListener(event, handler);

    // Cleanup function
    return () => {
      window.removeEventListener(event, handler);
    };
  }, [event, handler]);
}

// [Good] Cleanup timers
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timer
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// [Good] Cancel fetch requests
function useData(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      });

    // Cancel request on cleanup
    return () => {
      controller.abort();
    };
  }, [url]);

  return data;
}
```

### Avoid Memory Leaks

```typescript
// [Bad] Setting state after unmount
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser); // May run after unmount!
  }, [userId]);
}

// [Good] Check if mounted before setting state
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchUser(userId).then((data) => {
      if (isMounted) {
        setUser(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);
}

// [Good] Better: Use AbortController
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchUser(userId, { signal: controller.signal })
      .then(setUser)
      .catch((err) => {
        if (err.name !== "AbortError") {
          throw err;
        }
      });

    return () => controller.abort();
  }, [userId]);
}
```

---

## Monitoring and Metrics

### Core Web Vitals

```typescript
// app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

### Custom Performance Monitoring

```typescript
// lib/performance.ts
export function measurePerformance(name: string) {
  if (typeof window === "undefined") return { end: () => {} };

  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;

      // Log to analytics
      console.info(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

      // Send to analytics service
      if (process.env.NODE_ENV === "production") {
        sendToAnalytics({
          metric: name,
          value: duration,
        });
      }
    },
  };
}

// Usage
function HeavyComponent() {
  const perf = measurePerformance("HeavyComponent render");

  // Render logic

  useEffect(() => {
    perf.end();
  });
}
```

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "staticDistDir": ".next"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## Best Practices Summary

1. **Keep functions small** — Under 100 lines for JIT optimization
2. **Avoid nested functions** — Define functions at module level
3. **Use memoization wisely** — Only for expensive operations
4. **Optimize React components** — React.memo, stable keys, avoid inline objects
5. **Code split aggressively** — Dynamic imports for heavy components
6. **Tree shake imports** — Import only what you need
7. **Optimize images** — Use next/image with proper sizing
8. **Fetch in parallel** — Use Promise.all for independent requests
9. **Clean up effects** — Prevent memory leaks
10. **Monitor Core Web Vitals** — Track and improve continuously

---

_Next: [Testing](./07-testing.md)_
