# Testing

Comprehensive testing ensures your application works correctly and prevents regressions. This guide covers unit testing, component testing, integration testing, and end-to-end testing patterns for Next.js applications.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Testing](#unit-testing)
3. [Component Testing](#component-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Testing Patterns](#testing-patterns)
7. [Testing Server Components](#testing-server-components)
8. [Accessibility Testing](#accessibility-testing)

---

## Testing Philosophy

### The Testing Pyramid

```
        /\
       /  \       E2E Tests (Few)
      /----\      - Critical user journeys
     /      \     - Slow, expensive
    /--------\
   /          \   Integration Tests (Some)
  /------------\  - API routes, DB queries
 /              \ - Medium speed
/----------------\
        |         Unit Tests (Many)
        |         - Functions, hooks, utilities
        |         - Fast, cheap
```

### What to Test

| Test Type       | What to Test                       | What NOT to Test                |
| --------------- | ---------------------------------- | ------------------------------- |
| **Unit**        | Pure functions, utilities, hooks   | Implementation details          |
| **Component**   | User interactions, rendered output | Styling, third-party components |
| **Integration** | API routes, database queries       | External services               |
| **E2E**         | Critical user flows                | Everything (too slow)           |

### Coverage Targets

```json
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Unit Testing

### Jest Configuration for Next.js

```javascript
// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
  ],
};

module.exports = createJestConfig(customConfig);
```

```typescript
// jest.setup.ts
import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
```

### Testing Pure Functions

```typescript
// lib/utils/format.ts
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// __tests__/lib/utils/format.test.ts
import { formatCurrency, formatDate } from "@/lib/utils/format";

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats different currencies", () => {
    expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("handles negative numbers", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

describe("formatDate", () => {
  it("formats Date objects", () => {
    const date = new Date("2024-03-15");
    expect(formatDate(date)).toBe("March 15, 2024");
  });

  it("formats date strings", () => {
    expect(formatDate("2024-03-15")).toBe("March 15, 2024");
  });
});
```

### Testing Hooks

```typescript
// hooks/use-counter.ts
import { useState, useCallback } from "react";

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}

// __tests__/hooks/use-counter.test.ts
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "@/hooks/use-counter";

describe("useCounter", () => {
  it("initializes with default value", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("initializes with custom value", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("increments count", () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("decrements count", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it("resets to initial value", () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

### Mocking Patterns

```typescript
// __tests__/services/user.test.ts
import { getUser, createUser } from "@/services/user";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUser", () => {
    it("returns user when found", async () => {
      const mockUser = { id: "1", name: "John", email: "john@example.com" };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const user = await getUser("1");

      expect(user).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("returns null when not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await getUser("nonexistent");

      expect(user).toBeNull();
    });
  });
});
```

---

## Component Testing

### React Testing Library Setup

```typescript
// test-utils.tsx
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";

interface WrapperProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: WrapperProps) => {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
```

### Query Priorities

Use queries that reflect how users interact with your app:

```typescript
// Priority order (use the first one that applies):
// 1. getByRole - accessible roles (button, heading, textbox)
// 2. getByLabelText - form elements with labels
// 3. getByPlaceholderText - input placeholders
// 4. getByText - non-interactive elements
// 5. getByDisplayValue - current value in inputs
// 6. getByAltText - images
// 7. getByTitle - title attributes
// 8. getByTestId - last resort (data-testid)

// [Good] Accessible queries
const button = screen.getByRole("button", { name: /submit/i });
const nameInput = screen.getByLabelText(/name/i);
const heading = screen.getByRole("heading", { name: /welcome/i });

// [Avoid] Test IDs when accessible queries work
const button = screen.getByTestId("submit-button");
```

### Testing User Interactions

```typescript
// components/LoginForm.tsx
"use client";

import { useState } from "react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}

// __tests__/components/LoginForm.test.tsx
import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it("renders email and password fields", () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("submits form with entered values", async () => {
    const user = userEvent.setup();
    mockSubmit.mockResolvedValue(undefined);

    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(mockSubmit).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    mockSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();
  });

  it("displays error message on failure", async () => {
    const user = userEvent.setup();
    mockSubmit.mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials"
    );
  });
});
```

### Testing Async Operations

```typescript
// __tests__/components/UserList.test.tsx
import { render, screen, waitFor } from "@/test-utils";
import { UserList } from "@/components/UserList";

// Mock fetch
global.fetch = jest.fn();

describe("UserList", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("shows loading state initially", () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<UserList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays users after loading", async () => {
    const mockUsers = [
      { id: "1", name: "John" },
      { id: "2", name: "Jane" },
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Jane")).toBeInTheDocument();
    });
  });

  it("shows error message on failure", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<UserList />);

    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Integration Testing

### API Route Testing

```typescript
// __tests__/api/users.test.ts
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/users/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("Users API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("returns list of users", async () => {
      const mockUsers = [
        { id: "1", name: "John", email: "john@example.com" },
        { id: "2", name: "Jane", email: "jane@example.com" },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest("http://localhost/api/users");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUsers);
    });
  });

  describe("POST /api/users", () => {
    it("creates a new user", async () => {
      const newUser = {
        id: "1",
        name: "John",
        email: "john@example.com",
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const request = new NextRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ name: "John", email: "john@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(newUser);
    });

    it("returns validation error for invalid data", async () => {
      const request = new NextRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ name: "", email: "invalid" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
```

### MSW for API Mocking

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "1", name: "John", email: "john@example.com" },
        { id: "2", name: "Jane", email: "jane@example.com" },
      ],
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json(
      {
        success: true,
        data: { id: "3", ...body },
      },
      { status: 201 }
    );
  }),

  http.get("/api/users/:id", ({ params }) => {
    const { id } = params;

    if (id === "nonexistent") {
      return HttpResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { id, name: "John", email: "john@example.com" },
    });
  }),
];

// mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// jest.setup.ts
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## End-to-End Testing

### Playwright Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Object Pattern

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: /log in/i });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

// e2e/pages/DashboardPage.ts
import { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole("heading", { name: /welcome/i });
    this.logoutButton = page.getByRole("button", { name: /log out/i });
  }

  async isLoggedIn() {
    await this.welcomeHeading.waitFor();
    return true;
  }

  async logout() {
    await this.logoutButton.click();
  }
}
```

### E2E Test Examples

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Authentication", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login("user@example.com", "password123");

    await expect(page).toHaveURL("/dashboard");
    expect(await dashboardPage.isLoggedIn()).toBe(true);
  });

  test("invalid credentials show error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login("user@example.com", "wrongpassword");

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText(/invalid credentials/i);
  });

  test("logout redirects to login page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login("user@example.com", "password123");
    await dashboardPage.isLoggedIn();

    // Logout
    await dashboardPage.logout();

    await expect(page).toHaveURL("/login");
  });
});

// e2e/checkout.spec.ts
test.describe("Checkout Flow", () => {
  test("complete purchase flow", async ({ page }) => {
    // Add product to cart
    await page.goto("/products");
    await page
      .getByRole("button", { name: /add to cart/i })
      .first()
      .click();

    // Go to cart
    await page.getByRole("link", { name: /cart/i }).click();
    await expect(page).toHaveURL("/cart");

    // Proceed to checkout
    await page.getByRole("button", { name: /checkout/i }).click();

    // Fill shipping info
    await page.getByLabel("Address").fill("123 Main St");
    await page.getByLabel("City").fill("New York");
    await page.getByLabel("Zip").fill("10001");

    // Complete order
    await page.getByRole("button", { name: /place order/i }).click();

    // Verify confirmation
    await expect(page).toHaveURL(/\/orders\/\w+/);
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });
});
```

---

## Testing Patterns

### AAA Pattern (Arrange, Act, Assert)

```typescript
test("calculates order total correctly", () => {
  // Arrange
  const order = {
    items: [
      { price: 10, quantity: 2 },
      { price: 15, quantity: 1 },
    ],
    discount: 5,
  };

  // Act
  const total = calculateOrderTotal(order);

  // Assert
  expect(total).toBe(30); // (10*2 + 15*1) - 5
});
```

### Test Naming Conventions

```typescript
// Format: should [expected behavior] when [condition]
describe("ShoppingCart", () => {
  describe("addItem", () => {
    it("should add item to empty cart", () => {});
    it("should increase quantity when adding existing item", () => {});
    it("should throw error when adding item with invalid id", () => {});
  });

  describe("removeItem", () => {
    it("should remove item from cart", () => {});
    it("should do nothing when item not in cart", () => {});
  });

  describe("total", () => {
    it("should return 0 for empty cart", () => {});
    it("should calculate total of all items", () => {});
    it("should apply discount when coupon is valid", () => {});
  });
});
```

### Test Data Factories

```typescript
// test/factories/user.ts
import { faker } from "@faker-js/faker";

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: "user",
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, () => createMockUser());
}

// Usage in tests
const user = createMockUser({ role: "admin" });
const users = createMockUsers(5);
```

---

## Testing Server Components

### Testing RSC with Playwright

```typescript
// e2e/server-components.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Server Components", () => {
  test("page renders with server data", async ({ page }) => {
    await page.goto("/users");

    // Server component should render user list
    const userItems = page.getByRole("listitem");
    await expect(userItems).toHaveCount.atLeast(1);
  });

  test("server component handles errors gracefully", async ({ page }) => {
    // Navigate to page that will error
    await page.goto("/users/nonexistent");

    // Error boundary should show
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});
```

### Testing Server Actions

```typescript
// __tests__/actions/create-user.test.ts
import { createUser } from "@/actions/user";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: jest.fn(),
    },
  },
}));

describe("createUser server action", () => {
  it("creates user with valid data", async () => {
    const formData = new FormData();
    formData.append("name", "John");
    formData.append("email", "john@example.com");

    const result = await createUser({}, formData);

    expect(result.success).toBe(true);
  });

  it("returns validation errors for invalid data", async () => {
    const formData = new FormData();
    formData.append("name", "");
    formData.append("email", "invalid");

    const result = await createUser({}, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.name).toBeDefined();
    expect(result.errors?.email).toBeDefined();
  });
});
```

---

## Accessibility Testing

### jest-axe Integration

```typescript
// __tests__/components/Button.a11y.test.tsx
import { render } from "@/test-utils";
import { axe, toHaveNoViolations } from "jest-axe";
import { Button } from "@/components/ui/Button";

expect.extend(toHaveNoViolations);

describe("Button Accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when disabled", async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations with icon", async () => {
    const { container } = render(
      <Button aria-label="Settings">
        <SettingsIcon />
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Playwright Accessibility Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("home page has no accessibility violations", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("login form is accessible", async ({ page }) => {
    await page.goto("/login");

    const results = await new AxeBuilder({ page }).include("form").analyze();

    expect(results.violations).toEqual([]);
  });

  test("navigation is keyboard accessible", async ({ page }) => {
    await page.goto("/");

    // Tab through navigation
    await page.keyboard.press("Tab");
    const firstLink = page.getByRole("link").first();
    await expect(firstLink).toBeFocused();

    // Can activate with Enter
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL("/");
  });
});
```

---

## Best Practices Summary

1. **Follow testing pyramid** — Many unit tests, fewer integration, fewest E2E
2. **Use accessible queries** — Prefer getByRole, getByLabelText
3. **Test behavior, not implementation** — Focus on user outcomes
4. **Use AAA pattern** — Arrange, Act, Assert
5. **Create test factories** — Consistent mock data
6. **Mock at boundaries** — API calls, database, external services
7. **Test error states** — Not just happy paths
8. **Include accessibility tests** — jest-axe and Playwright
9. **Use page objects for E2E** — Maintainable test code
10. **Run tests in CI** — Catch regressions early

---

_Next: [Security](./08-security.md)_
