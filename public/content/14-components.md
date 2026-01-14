# Component Patterns

Well-designed components are reusable, composable, and maintainable. This guide covers patterns for building flexible React components in Next.js applications.

---

## Table of Contents

1. [Component Composition](#component-composition)
2. [Props Design](#props-design)
3. [Compound Components](#compound-components)
4. [Render Props and Slots](#render-props-and-slots)
5. [Higher-Order Components](#higher-order-components)
6. [Custom Hooks Extraction](#custom-hooks-extraction)

---

## Component Composition

### Prefer Composition Over Props

```typescript
// [Bad] Too many props for customization
interface CardProps {
  title: string;
  subtitle?: string;
  titleSize?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  onClose?: () => void;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

function Card({ title, subtitle, titleSize, showCloseButton, ... }: CardProps) {
  // Complex conditional rendering
}

// [Good] Composable components
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
}

function Card({ children, variant = 'default', className }: CardProps) {
  return (
    <div className={cn('card', `card-${variant}`, className)}>
      {children}
    </div>
  );
}

function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card-header', className)}>{children}</div>;
}

function CardTitle({ children, size = 'md' }: { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  return <h3 className={cn('card-title', `text-${size}`)}>{children}</h3>;
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card-content', className)}>{children}</div>;
}

function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card-footer', className)}>{children}</div>;
}

// Usage - Flexible composition
<Card>
  <CardHeader>
    <CardTitle size="lg">Title</CardTitle>
    <Button variant="ghost" size="sm">
      <XIcon />
    </Button>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Children Pattern

```typescript
// [Good] Flexible children
interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Usage
<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
  <DialogHeader>
    <DialogTitle>Confirm Action</DialogTitle>
  </DialogHeader>
  <DialogBody>Are you sure you want to continue?</DialogBody>
  <DialogFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </DialogFooter>
</Dialog>;
```

---

## Props Design

### Interface Segregation

```typescript
// [Bad] Monolithic props interface
interface ButtonProps {
  children: React.ReactNode;
  variant: "primary" | "secondary" | "outline";
  size: "sm" | "md" | "lg";
  disabled: boolean;
  loading: boolean;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  onClick: () => void;
  type: "button" | "submit" | "reset";
  className: string;
  // ... 20 more props
}

// [Good] Extend native elements and use optional props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("button", `button-${variant}`, `button-${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
}
```

### Polymorphic Components

```typescript
// Component that can render as different elements
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

interface TextProps {
  variant?: 'body' | 'heading' | 'caption';
  color?: 'default' | 'muted' | 'error';
}

function Text<C extends React.ElementType = 'span'>({
  as,
  variant = 'body',
  color = 'default',
  className,
  children,
  ...props
}: PolymorphicComponentProps<C, TextProps>) {
  const Component = as || 'span';

  return (
    <Component
      className={cn(`text-${variant}`, `text-${color}`, className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Usage
<Text>Default span</Text>
<Text as="p" variant="body">Paragraph</Text>
<Text as="h1" variant="heading">Heading</Text>
<Text as={Link} href="/about" color="muted">Link</Text>
```

### Default Props

```typescript
// [Good] Defaults in destructuring
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

function Input({
  label,
  error,
  helperText,
  type = "text",
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || useId();

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cn("input", error && "input-error", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="input-error-text">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="input-helper-text">{helperText}</p>
      )}
    </div>
  );
}
```

---

## Compound Components

Compound components share implicit state and work together.

### Context-Based Compound

```typescript
// components/Tabs/index.tsx
import { createContext, useContext, useState } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>");
  }
  return context;
}

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  onChange?: (value: string) => void;
}

function Tabs({ defaultValue, children, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return (
    <div role="tablist" className="tab-list">
      {children}
    </div>
  );
}

function Tab({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={cn("tab", isActive && "tab-active")}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Export compound component
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };

// Usage
<Tabs defaultValue="account" onChange={(tab) => console.log(tab)}>
  <Tabs.List>
    <Tabs.Tab value="account">Account</Tabs.Tab>
    <Tabs.Tab value="password">Password</Tabs.Tab>
    <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="account">Account settings here</Tabs.Panel>
  <Tabs.Panel value="password">Password settings here</Tabs.Panel>
  <Tabs.Panel value="notifications">Notification settings here</Tabs.Panel>
</Tabs>;
```

### Select Component

```typescript
// components/Select/index.tsx
"use client";

import { createContext, useContext, useState, useRef } from "react";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within <Select>");
  }
  return context;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);

  const currentValue = value ?? internalValue;
  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div className="select-root">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({
  children,
  placeholder,
}: {
  children?: React.ReactNode;
  placeholder?: string;
}) {
  const { value, open, setOpen } = useSelect();

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      className="select-trigger"
      onClick={() => setOpen(!open)}
    >
      {children || value || placeholder}
      <ChevronDown className="select-icon" />
    </button>
  );
}

function SelectContent({ children }: { children: React.ReactNode }) {
  const { open } = useSelect();

  if (!open) return null;

  return (
    <div role="listbox" className="select-content">
      {children}
    </div>
  );
}

function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const { value: selectedValue, onValueChange } = useSelect();
  const isSelected = selectedValue === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn("select-item", isSelected && "select-item-selected")}
      onClick={() => onValueChange(value)}
    >
      {children}
      {isSelected && <Check className="select-check" />}
    </div>
  );
}

Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;

export { Select };

// Usage
<Select value={role} onValueChange={setRole}>
  <Select.Trigger placeholder="Select a role" />
  <Select.Content>
    <Select.Item value="admin">Admin</Select.Item>
    <Select.Item value="editor">Editor</Select.Item>
    <Select.Item value="viewer">Viewer</Select.Item>
  </Select.Content>
</Select>;
```

---

## Render Props and Slots

### Render Props Pattern

```typescript
// components/Toggle.tsx
interface ToggleProps {
  defaultOn?: boolean;
  children: (props: {
    on: boolean;
    toggle: () => void;
    setOn: (on: boolean) => void;
  }) => React.ReactNode;
}

function Toggle({ defaultOn = false, children }: ToggleProps) {
  const [on, setOn] = useState(defaultOn);
  const toggle = () => setOn((prev) => !prev);

  return <>{children({ on, toggle, setOn })}</>;
}

// Usage - Full control over rendering
<Toggle>
  {({ on, toggle }) => (
    <div>
      <span>The toggle is {on ? "on" : "off"}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  )}
</Toggle>;
```

### Slots Pattern

```typescript
// components/PageLayout.tsx
interface PageLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

function PageLayout({ header, sidebar, footer, children }: PageLayoutProps) {
  return (
    <div className="page-layout">
      {header && <header className="page-header">{header}</header>}
      <div className="page-body">
        {sidebar && <aside className="page-sidebar">{sidebar}</aside>}
        <main className="page-content">{children}</main>
      </div>
      {footer && <footer className="page-footer">{footer}</footer>}
    </div>
  );
}

// Usage
<PageLayout
  header={<Navigation />}
  sidebar={<Sidebar items={navItems} />}
  footer={<Footer />}
>
  <h1>Page Content</h1>
  <p>Main content here</p>
</PageLayout>;
```

### Function as Children with Data

```typescript
// components/DataFetcher.tsx
interface DataFetcherProps<T> {
  url: string;
  children: (props: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {({ data, loading, error, refetch }) => {
    if (loading) return <Spinner />;
    if (error) return <ErrorMessage error={error} onRetry={refetch} />;
    return <UserList users={data!} />;
  }}
</DataFetcher>;
```

---

## Higher-Order Components

Use HOCs sparingly; prefer hooks and composition when possible.

### Auth HOC

```typescript
// hoc/with-auth.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { requiredRole?: string } = {}
) {
  return async function AuthenticatedComponent(props: P) {
    const session = await getSession();

    if (!session) {
      redirect("/login");
    }

    if (options.requiredRole && session.role !== options.requiredRole) {
      redirect("/unauthorized");
    }

    return <Component {...props} />;
  };
}

// Usage
function AdminDashboard() {
  return <div>Admin Dashboard</div>;
}

export default withAuth(AdminDashboard, { requiredRole: "admin" });
```

### Loading HOC

```typescript
// hoc/with-loading.tsx
interface WithLoadingProps {
  loading?: boolean;
}

export function withLoading<P extends object>(
  Component: React.ComponentType<P>,
  LoadingComponent: React.ComponentType = DefaultSpinner
) {
  return function ComponentWithLoading({
    loading,
    ...props
  }: P & WithLoadingProps) {
    if (loading) {
      return <LoadingComponent />;
    }

    return <Component {...(props as P)} />;
  };
}

// Usage
const UserListWithLoading = withLoading(UserList, UserListSkeleton);

<UserListWithLoading loading={isLoading} users={users} />;
```

---

## Custom Hooks Extraction

Extract reusable logic into custom hooks.

### Form Field Hook

```typescript
// hooks/use-form-field.ts
interface UseFormFieldOptions {
  validate?: (value: string) => string | undefined;
}

export function useFormField(
  initialValue: string = "",
  options: UseFormFieldOptions = {}
) {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validate = useCallback(() => {
    if (options.validate) {
      const validationError = options.validate(value);
      setError(validationError);
      return !validationError;
    }
    return true;
  }, [value, options.validate]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (touched) {
        validate();
      }
    },
    [touched, validate]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setTouched(false);
    setError(undefined);
  }, [initialValue]);

  return {
    value,
    error: touched ? error : undefined,
    touched,
    onChange: handleChange,
    onBlur: handleBlur,
    reset,
    validate,
    setValue,
  };
}

// Usage
function SignupForm() {
  const email = useFormField("", {
    validate: (v) => {
      if (!v) return "Email is required";
      if (!/\S+@\S+\.\S+/.test(v)) return "Invalid email";
      return undefined;
    },
  });

  const password = useFormField("", {
    validate: (v) => {
      if (!v) return "Password is required";
      if (v.length < 8) return "Password must be at least 8 characters";
      return undefined;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = email.validate();
    const isPasswordValid = password.validate();

    if (isEmailValid && isPasswordValid) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email.value}
        onChange={email.onChange}
        onBlur={email.onBlur}
        error={email.error}
      />
      <Input
        label="Password"
        type="password"
        value={password.value}
        onChange={password.onChange}
        onBlur={password.onBlur}
        error={password.error}
      />
      <Button type="submit">Sign Up</Button>
    </form>
  );
}
```

### Disclosure Hook

```typescript
// hooks/use-disclosure.ts
interface UseDisclosureOptions {
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useDisclosure(options: UseDisclosureOptions = {}) {
  const { defaultOpen = false, onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// Usage
function DeleteUserButton({ userId }: { userId: string }) {
  const dialog = useDisclosure({
    onClose: () => console.log("Dialog closed"),
  });

  return (
    <>
      <Button variant="destructive" onClick={dialog.open}>
        Delete User
      </Button>
      <ConfirmDialog
        open={dialog.isOpen}
        onClose={dialog.close}
        onConfirm={() => {
          deleteUser(userId);
          dialog.close();
        }}
        title="Delete User"
        message="Are you sure you want to delete this user?"
      />
    </>
  );
}
```

---

## Best Practices Summary

1. **Prefer composition** — Build flexible components with children
2. **Extend native elements** — Inherit HTML attributes
3. **Use compound components** — For related, stateful components
4. **Extract hooks** — Reuse stateful logic
5. **Provide defaults** — Make optional props optional
6. **Use polymorphic components** — For flexible rendering
7. **Keep props minimal** — Avoid prop explosion
8. **Document with examples** — Show how to use components
9. **Test composition** — Ensure parts work together
10. **Consider accessibility** — ARIA, focus, keyboard

---

_Next: [Forms & Validation](./15-forms-validation.md)_
