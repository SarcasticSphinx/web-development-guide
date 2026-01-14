# Accessibility

Building accessible applications ensures everyone can use your product, regardless of ability. This guide covers WCAG 2.1 compliance and practical accessibility patterns for Next.js applications.

---

## Table of Contents

1. [Semantic HTML](#semantic-html)
2. [Keyboard Navigation](#keyboard-navigation)
3. [ARIA Usage](#aria-usage)
4. [Color and Contrast](#color-and-contrast)
5. [Images and Media](#images-and-media)
6. [Forms](#forms)
7. [Dynamic Content](#dynamic-content)
8. [Testing Accessibility](#testing-accessibility)

---

## Semantic HTML

Use the correct HTML elements for their intended purpose. Semantic HTML provides built-in accessibility features.

### Landmark Regions

```typescript
// [Good] Semantic landmarks
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <ul>
            <li><Link href="/">Home</a></li>
            <li><Link href="/products">Products</a></li>
            <li><Link href="/about">About</a></li>
          </ul>
        </nav>
      </header>

      <main>{children}</main>

      <aside aria-label="Related content">
        {/* Sidebar content */}
      </aside>

      <footer>
        <nav aria-label="Footer navigation">
          {/* Footer links */}
        </nav>
      </footer>
    </>
  );
}

// [Bad] Divs with no semantic meaning
function BadLayout({ children }) {
  return (
    <div className="header">
      <div className="nav">...</div>
    </div>
    <div className="main">{children}</div>
    <div className="footer">...</div>
  );
}
```

### Heading Hierarchy

```typescript
// [Good] Proper heading hierarchy
function ProductPage({ product }: { product: Product }) {
  return (
    <article>
      <h1>{product.name}</h1>

      <section>
        <h2>Description</h2>
        <p>{product.description}</p>
      </section>

      <section>
        <h2>Specifications</h2>
        <h3>Dimensions</h3>
        <p>...</p>
        <h3>Materials</h3>
        <p>...</p>
      </section>

      <section>
        <h2>Reviews</h2>
        {product.reviews.map((review) => (
          <article key={review.id}>
            <h3>{review.title}</h3>
            <p>{review.content}</p>
          </article>
        ))}
      </section>
    </article>
  );
}

// [Bad] Skipping heading levels
function BadProductPage() {
  return (
    <div>
      <h1>Product Name</h1>
      <h4>Description</h4> {/* Skipped h2 and h3! */}
    </div>
  );
}
```

### Lists

```typescript
// [Good] Semantic lists
function Navigation() {
  return (
    <nav aria-label="Main">
      <ul>
        <li>
          <Link href="/">Home</a>
        </li>
        <li>
          <Link href="/products">Products</a>
        </li>
        <li>
          <Link href="/about">About</a>
        </li>
      </ul>
    </nav>
  );
}

// [Good] Definition list for key-value pairs
function ProductSpecs({ specs }: { specs: Record<string, string> }) {
  return (
    <dl>
      {Object.entries(specs).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

### Tables

```typescript
// [Good] Accessible table
function DataTable({ users }: { users: User[] }) {
  return (
    <table>
      <caption>User Directory</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Role</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role}</td>
            <td>
              <button aria-label={`Edit ${user.name}`}>Edit</button>
              <button aria-label={`Delete ${user.name}`}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Keyboard Navigation

All interactive elements must be keyboard accessible.

### Focus Management

```typescript
// [Good] Proper focus management in modal
"use client";

import { useEffect, useRef, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [isOpen]);

  // Trap focus inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">Modal Title</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

### Skip Links

```typescript
// [Good] Skip link for keyboard users
function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4"
    >
      Skip to main content
    </a>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <header>
        <nav>{/* Navigation */}</nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
```

### Focus Indicators

```css
/* [Good] Visible focus indicators */
:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

/* Don't remove focus outline entirely */
/* [Bad] Never do this */
*:focus {
  outline: none;
}

/* [Good] Acceptable: Custom focus style */
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.5);
}
```

### Tab Order

```typescript
// [Good] Natural tab order
function SearchForm() {
  return (
    <form>
      <input type="search" placeholder="Search..." />
      <select>
        <option>All categories</option>
        <option>Electronics</option>
      </select>
      <button type="submit">Search</button>
    </form>
  );
}

// [Bad] Manipulated tab order
function BadForm() {
  return (
    <form>
      <button tabIndex={1}>Submit</button> {/* First */}
      <input tabIndex={3} /> {/* Third */}
      <select tabIndex={2}></select> {/* Second */}
    </form>
  );
}

// [Good] Remove from tab order appropriately
function IconButton({ icon, label }: Props) {
  return (
    <button aria-label={label}>
      <Icon name={icon} aria-hidden="true" tabIndex={-1} />
    </button>
  );
}
```

---

## ARIA Usage

ARIA (Accessible Rich Internet Applications) enhances accessibility for dynamic content. Use it to supplement, not replace, semantic HTML.

### First Rule of ARIA

> Don't use ARIA if you can use native HTML.

```typescript
// [Bad] Using ARIA when HTML works
<div role="button" tabIndex={0} onClick={handleClick}>
  Click me
</div>

// [Good] Native button element
<button onClick={handleClick}>
  Click me
</button>
```

### Common ARIA Patterns

```typescript
// [Good] Accordion
function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {items.map((item, index) => (
        <div key={item.id}>
          <h3>
            <button
              id={`accordion-header-${index}`}
              aria-expanded={openIndex === index}
              aria-controls={`accordion-panel-${index}`}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              {item.title}
              <ChevronIcon aria-hidden="true" />
            </button>
          </h3>
          <div
            id={`accordion-panel-${index}`}
            role="region"
            aria-labelledby={`accordion-header-${index}`}
            hidden={openIndex !== index}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// [Good] Tabs
function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${index}`}
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`tabpanel-${index}`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`tabpanel-${index}`}
          role="tabpanel"
          aria-labelledby={`tab-${index}`}
          hidden={activeIndex !== index}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// [Good] Dropdown menu
function DropdownMenu({ items }: { items: MenuItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Menu
      </button>
      {isOpen && (
        <ul role="menu" aria-orientation="vertical">
          {items.map((item, index) => (
            <li
              key={item.id}
              role="menuitem"
              tabIndex={activeIndex === index ? 0 : -1}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### ARIA Labels

```typescript
// [Good] aria-label for icons without visible text
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// [Good] aria-labelledby for complex labels
<section aria-labelledby="section-heading">
  <h2 id="section-heading">Featured Products</h2>
  {/* Content */}
</section>

// [Good] aria-describedby for additional context
<input
  type="password"
  aria-describedby="password-requirements"
/>
<p id="password-requirements">
  Password must be at least 8 characters
</p>
```

---

## Color and Contrast

### Contrast Requirements

WCAG 2.1 AA requirements:

- Normal text: 4.5:1 contrast ratio
- Large text (18pt or 14pt bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

```css
/* [Good] High contrast text */
.text-primary {
  color: #1a1a1a; /* Very dark gray on white */
}

.text-link {
  color: #2563eb; /* Blue with 4.5:1 ratio on white */
}

/* [Good] Focus indicators with sufficient contrast */
.button:focus-visible {
  outline: 2px solid #4f46e5; /* 4.5:1 on white background */
  outline-offset: 2px;
}
```

### Don't Rely on Color Alone

```typescript
// [Bad] Color is the only indicator
function Badge({ status }: { status: "success" | "error" }) {
  return (
    <span className={status === "success" ? "bg-green-500" : "bg-red-500"}>
      {/* No text, just color */}
    </span>
  );
}

// [Good] Color plus text/icon
function Badge({ status }: { status: "success" | "error" }) {
  return (
    <span
      className={
        status === "success"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }
    >
      {status === "success" ? (
        <>
          <CheckIcon aria-hidden="true" />
          <span>Success</span>
        </>
      ) : (
        <>
          <XIcon aria-hidden="true" />
          <span>Error</span>
        </>
      )}
    </span>
  );
}

// [Good] Form errors with icon and text
function FormField({ error }: { error?: string }) {
  return (
    <div>
      <input
        aria-invalid={!!error}
        aria-describedby={error ? "error-message" : undefined}
        className={error ? "border-red-500" : "border-gray-300"}
      />
      {error && (
        <p id="error-message" className="text-red-600 flex items-center gap-1">
          <AlertIcon aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
```

---

## Images and Media

### Alt Text Guidelines

```typescript
// [Good] Descriptive alt text for informational images
<Image
  src="/product-photo.jpg"
  alt="Red leather handbag with gold clasp, front view"
  width={400}
  height={300}
/>

// [Good] Empty alt for decorative images
<Image
  src="/decorative-pattern.svg"
  alt=""
  aria-hidden="true"
  width={100}
  height={100}
/>

// [Good] Alt text describes function for linked images
<Link href="/products/handbag">
  <Image
    src="/product-photo.jpg"
    alt="View red leather handbag details"
    width={400}
    height={300}
  />
</a>

// [Bad] Redundant or unhelpful alt text
<Image src="/cat.jpg" alt="image" />  // Too vague
<Image src="/cat.jpg" alt="cat.jpg" />  // File name
<Image src="/cat.jpg" alt="Photo of a photo of cat" />  // Don't say "photo of"
```

### Video Accessibility

```typescript
// [Good] Accessible video with captions
function VideoPlayer({ src, title }: { src: string; title: string }) {
  return (
    <div>
      <video controls aria-label={title} preload="metadata">
        <source src={src} type="video/mp4" />
        <track
          kind="captions"
          src="/captions.vtt"
          srcLang="en"
          label="English"
          default
        />
        <track
          kind="descriptions"
          src="/descriptions.vtt"
          srcLang="en"
          label="English Audio Descriptions"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
```

---

## Forms

### Labels and Inputs

```typescript
// [Good] Associated label
<div>
  <label htmlFor="email">Email address</label>
  <input id="email" type="email" name="email" />
</div>

// [Good] Label wrapping input
<label>
  <span>Email address</span>
  <input type="email" name="email" />
</label>

// [Good] aria-label when visual label isn't possible
<input
  type="search"
  aria-label="Search products"
  placeholder="Search..."
/>
```

### Error Messages

```typescript
// [Good] Accessible form with error handling
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
}

function FormField({
  label,
  name,
  type = "text",
  error,
  required,
}: FormFieldProps) {
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <div>
      <label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {required && <span className="sr-only">(required)</span>}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <p id={errorId} role="alert" className="text-red-600">
          <AlertIcon aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### Required Fields

```typescript
// [Good] Clear indication of required fields
function SignupForm() {
  return (
    <form>
      <p className="text-sm text-gray-600">
        Fields marked with <span aria-hidden="true">*</span> are required.
      </p>

      <FormField label="Full name" name="name" required error={errors.name} />

      <FormField
        label="Email"
        name="email"
        type="email"
        required
        error={errors.email}
      />

      <FormField
        label="Phone (optional)"
        name="phone"
        type="tel"
        error={errors.phone}
      />

      <button type="submit">Sign up</button>
    </form>
  );
}
```

### Form Validation Feedback

```typescript
// [Good] Real-time validation with announcements
"use client";

import { useState } from "react";

function PasswordField() {
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
  ];

  const allMet = requirements.every((r) => r.met);

  return (
    <div>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-describedby="password-requirements"
        aria-invalid={touched && !allMet}
      />

      <ul id="password-requirements" aria-label="Password requirements">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={req.met ? "text-green-600" : "text-gray-500"}
          >
            {req.met ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <XIcon aria-hidden="true" />
            )}
            <span className="sr-only">
              {req.met ? "Requirement met:" : "Requirement not met:"}
            </span>
            {req.label}
          </li>
        ))}
      </ul>

      {/* Announce changes to screen readers */}
      <div aria-live="polite" className="sr-only">
        {touched && allMet && "Password meets all requirements"}
      </div>
    </div>
  );
}
```

---

## Dynamic Content

### Live Regions

```typescript
// [Good] Announce dynamic content changes
function SearchResults({ results, isLoading }: Props) {
  return (
    <div>
      {/* Announce loading state */}
      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <p>Loading results...</p>
        ) : (
          <p>{results.length} results found</p>
        )}
      </div>

      <ul>
        {results.map((result) => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}

// [Good] Toast notifications
function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      role="alert"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`toast toast-${type}`}
    >
      {type === "success" ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <AlertIcon aria-hidden="true" />
      )}
      {message}
    </div>
  );
}
```

### Loading States

```typescript
// [Good] Accessible loading indicator
function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <svg className="animate-spin" aria-hidden="true" viewBox="0 0 24 24">
        {/* Spinner SVG */}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// [Good] Skeleton with loading state
function UserCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading user information">
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-4 w-24" />
    </div>
  );
}
```

### Progress Indicators

```typescript
// [Good] Accessible progress bar
function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progress: ${percentage}%`}
    >
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

// [Good] Multi-step form progress
function FormProgress({ currentStep, totalSteps }: Props) {
  return (
    <nav aria-label="Form progress">
      <ol>
        {Array.from({ length: totalSteps }, (_, i) => (
          <li key={i} aria-current={i + 1 === currentStep ? "step" : undefined}>
            <span className="sr-only">
              Step {i + 1} of {totalSteps}:
            </span>
            {i + 1 < currentStep && (
              <span className="sr-only">(completed)</span>
            )}
            Step {i + 1}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

---

## Testing Accessibility

### Automated Testing with jest-axe

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
});
```

### Playwright Accessibility Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("homepage has no accessibility violations", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("can navigate with keyboard only", async ({ page }) => {
    await page.goto("/");

    // Tab to first interactive element
    await page.keyboard.press("Tab");
    const skipLink = page.locator(":focus");
    await expect(skipLink).toHaveText(/skip/i);

    // Use skip link
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
```

### Manual Testing Checklist

```markdown
## Accessibility Testing Checklist

### Keyboard Navigation

- [ ] All interactive elements are focusable
- [ ] Focus order is logical
- [ ] Focus is visible at all times
- [ ] No keyboard traps
- [ ] Skip link works
- [ ] Modals trap focus correctly

### Screen Reader

- [ ] All images have appropriate alt text
- [ ] Form fields have labels
- [ ] Errors are announced
- [ ] Dynamic content updates are announced
- [ ] Landmarks are present and labeled

### Visual

- [ ] Text has 4.5:1 contrast ratio
- [ ] UI components have 3:1 contrast ratio
- [ ] Focus indicators are visible
- [ ] Content is visible at 200% zoom
- [ ] Color is not the only indicator

### Forms

- [ ] Labels are associated with inputs
- [ ] Required fields are indicated
- [ ] Error messages are clear
- [ ] Success messages are announced
- [ ] Form can be submitted with keyboard

### Motion

- [ ] Animations respect reduced-motion preference
- [ ] No content flashes more than 3 times per second
```

### Reduced Motion

```css
/* [Good] Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// [Good] React hook for reduced motion
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}
```

---

## Best Practices Summary

1. **Use semantic HTML** — Right elements for the right purpose
2. **Ensure keyboard access** — All functionality via keyboard
3. **Provide visible focus** — Never remove focus outlines
4. **Use ARIA sparingly** — Only when HTML isn't enough
5. **Maintain heading hierarchy** — Don't skip levels
6. **Ensure sufficient contrast** — 4.5:1 for text, 3:1 for UI
7. **Don't rely on color alone** — Use text/icons too
8. **Label all form fields** — Associate labels with inputs
9. **Announce dynamic changes** — Use live regions
10. **Test with real tools** — Screen readers, keyboard navigation

---

_Next: [Documentation](./10-documentation.md)_
