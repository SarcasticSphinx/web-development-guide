# Forms & Validation

Forms are critical for user interaction. This guide covers patterns for building robust, accessible, and validated forms in Next.js applications.

---

## Table of Contents

1. [React Hook Form Setup](#react-hook-form-setup)
2. [Zod Schema Validation](#zod-schema-validation)
3. [Server-Side Validation](#server-side-validation)
4. [Error Display Patterns](#error-display-patterns)
5. [Controlled vs Uncontrolled](#controlled-vs-uncontrolled)
6. [File Upload Handling](#file-upload-handling)

---

## React Hook Form Setup

### Installation and Configuration

```bash
npm install react-hook-form @hookform/resolvers zod
```

### Basic Form with React Hook Form

```typescript
// components/forms/ContactForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    await submitContactForm(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          {...register("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="error">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="error">{errors.email.message}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          {...register("subject")}
          aria-invalid={!!errors.subject}
        />
        {errors.subject && <p className="error">{errors.subject.message}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          rows={5}
          {...register("message")}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className="error">{errors.message.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
```

### Form with Default Values

```typescript
interface UserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => Promise<void>;
}

export function UserForm({ user, onSubmit }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "user",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Saving..." : user ? "Update" : "Create"}
      </button>
    </form>
  );
}
```

---

## Zod Schema Validation

### Basic Schemas

```typescript
// lib/schemas/user.ts
import { z } from "zod";

export const userSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .trim(),

  email: z.string().email("Invalid email address").toLowerCase().trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),

  role: z.enum(["admin", "editor", "user"]).default("user"),

  age: z
    .number()
    .int("Age must be a whole number")
    .min(13, "Must be at least 13 years old")
    .max(120, "Invalid age")
    .optional(),

  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type UserFormData = z.infer<typeof userSchema>;
```

### Password Confirmation

```typescript
export const registerSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error appears on confirmPassword field
  });
```

### Conditional Validation

```typescript
const orderSchema = z
  .object({
    paymentMethod: z.enum(["card", "bank", "crypto"]),

    // Card-specific fields
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvc: z.string().optional(),

    // Bank-specific fields
    bankAccount: z.string().optional(),
    routingNumber: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === "card") {
        return data.cardNumber && data.cardExpiry && data.cardCvc;
      }
      return true;
    },
    {
      message: "Card details are required",
      path: ["cardNumber"],
    }
  )
  .refine(
    (data) => {
      if (data.paymentMethod === "bank") {
        return data.bankAccount && data.routingNumber;
      }
      return true;
    },
    {
      message: "Bank details are required",
      path: ["bankAccount"],
    }
  );
```

### Custom Validation

```typescript
// Check if email is already taken
const emailAvailableSchema = z
  .string()
  .email()
  .refine(
    async (email) => {
      const exists = await checkEmailExists(email);
      return !exists;
    },
    { message: "This email is already registered" }
  );

// Phone number with custom format
const phoneSchema = z
  .string()
  .refine((value) => /^\+?[\d\s-()]+$/.test(value), {
    message: "Invalid phone number format",
  });

// Date must be in the future
const futureDateSchema = z.date().refine((date) => date > new Date(), {
  message: "Date must be in the future",
});
```

### Reusable Schema Parts

```typescript
// lib/schemas/common.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idSchema = z.object({
  id: z.string().cuid(),
});

export const timestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Combine schemas
export const paginatedRequestSchema = paginationSchema.extend({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

---

## Server-Side Validation

### Server Action with Validation

```typescript
// actions/user.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export interface ActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse and validate
  const validatedFields = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // Return field errors if validation fails
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        errors: { email: ["This email is already registered"] },
      };
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    revalidatePath("/users");
  } catch (error) {
    return {
      success: false,
      errors: { _form: ["An unexpected error occurred"] },
    };
  }

  redirect("/users");
}
```

### Using Server Action in Form

```typescript
// components/forms/CreateUserForm.tsx
"use client";

import { useActionState } from "react";
import { createUser, type ActionState } from "@/actions/user";

const initialState: ActionState = {
  success: false,
};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction}>
      {state.errors?._form && (
        <div className="form-error" role="alert">
          {state.errors._form[0]}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          aria-invalid={!!state.errors?.name}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
        {state.errors?.name && (
          <p id="name-error" className="error">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={!!state.errors?.email}
        />
        {state.errors?.email && (
          <p className="error">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          aria-invalid={!!state.errors?.password}
        />
        {state.errors?.password && (
          <p className="error">{state.errors.password[0]}</p>
        )}
      </div>

      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

---

## Error Display Patterns

### Inline Errors

```typescript
// components/ui/FormField.tsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
  register: UseFormRegister<any>;
}

export function FormField({
  label,
  name,
  type = "text",
  error,
  required,
  register,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        {...register(name)}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn("input", error && "input-error")}
      />

      {error && (
        <p id={errorId} className="error-message" role="alert">
          <AlertCircle className="icon" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### Error Summary

```typescript
// components/ui/ErrorSummary.tsx
interface ErrorSummaryProps {
  errors: Record<string, { message?: string }>;
}

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  const errorList = Object.entries(errors);

  if (errorList.length === 0) return null;

  return (
    <div
      className="error-summary"
      role="alert"
      aria-labelledby="error-summary-title"
    >
      <h2 id="error-summary-title">
        There {errorList.length === 1 ? "is" : "are"} {errorList.length} error
        {errorList.length === 1 ? "" : "s"} in this form
      </h2>
      <ul>
        {errorList.map(([field, error]) => (
          <li key={field}>
            <Link href={`#${field}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Usage
function Form() {
  const {
    formState: { errors },
  } = useForm();

  return (
    <form>
      <ErrorSummary errors={errors} />
      {/* Form fields */}
    </form>
  );
}
```

### Toast Notifications

```typescript
// hooks/use-toast.ts
import { toast } from "sonner";

export function useFormToast() {
  return {
    success: (message: string) => {
      toast.success(message);
    },
    error: (message: string) => {
      toast.error(message);
    },
    formError: (errors: Record<string, string[]>) => {
      const firstError = Object.values(errors)[0]?.[0];
      if (firstError) {
        toast.error(firstError);
      }
    },
  };
}

// Usage in form
function CreateUserForm() {
  const { success, formError } = useFormToast();
  const [state, formAction] = useActionState(createUser, initialState);

  useEffect(() => {
    if (state.success) {
      success("User created successfully!");
    } else if (state.errors?._form) {
      formError({ form: state.errors._form });
    }
  }, [state]);

  return <form action={formAction}>{/* ... */}</form>;
}
```

---

## Controlled vs Uncontrolled

### Uncontrolled (Recommended for Most Cases)

```typescript
// [Good] Uncontrolled with React Hook Form
function UncontrolledForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      <input {...register("password")} type="password" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Controlled (When Needed)

```typescript
// Use controlled when you need:
// - Real-time validation feedback
// - Computed values based on input
// - Complex conditional logic

function ControlledForm() {
  const { control, handleSubmit, watch } = useForm();
  const password = watch("password");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Input {...field} error={fieldState.error?.message} label="Email" />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <div>
            <Input
              {...field}
              type="password"
              label="Password"
              error={fieldState.error?.message}
            />
            <PasswordStrength password={field.value} />
          </div>
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        rules={{
          validate: (value) => value === password || "Passwords do not match",
        }}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            type="password"
            label="Confirm Password"
            error={fieldState.error?.message}
          />
        )}
      />
    </form>
  );
}
```

### Custom Components with Controller

```typescript
// components/forms/Select.tsx
interface SelectFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  options: { value: string; label: string }[];
}

export function SelectField({
  name,
  control,
  label,
  options,
}: SelectFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="form-field">
          <label htmlFor={name}>{label}</label>
          <select
            {...field}
            id={name}
            className={cn("select", fieldState.error && "select-error")}
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldState.error && (
            <p className="error">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
```

---

## File Upload Handling

### Single File Upload

```typescript
// components/forms/FileUpload.tsx
"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onUpload: (file: File) => Promise<string>; // Returns URL
}

export function FileUpload({
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB
  onUpload,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
        id="file-upload"
      />

      <label
        htmlFor="file-upload"
        className={cn("file-upload-label", uploading && "uploading")}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="preview" />
        ) : (
          <div className="placeholder">
            <UploadIcon />
            <span>Click to upload</span>
          </div>
        )}
      </label>

      {uploading && <p className="uploading-text">Uploading...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### With React Hook Form

```typescript
// components/forms/ImageUploadField.tsx
"use client";

import { Controller, Control } from "react-hook-form";

interface ImageUploadFieldProps {
  name: string;
  control: Control<any>;
  label: string;
}

export function ImageUploadField({
  name,
  control,
  label,
}: ImageUploadFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState }) => (
        <div className="form-field">
          <label>{label}</label>
          <FileUpload
            onUpload={async (file) => {
              const formData = new FormData();
              formData.append("file", file);

              const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              });

              const { url } = await response.json();
              onChange(url);
              return url;
            }}
          />
          {value && <p className="file-url">Uploaded: {value}</p>}
          {fieldState.error && (
            <p className="error">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
```

### Server-Side File Handling

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename
  const ext = file.name.split(".").pop();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = join(process.cwd(), "public", "uploads", filename);

  await writeFile(path, buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
```

---

## Best Practices Summary

1. **Use React Hook Form** — Reduces re-renders, great DX
2. **Validate with Zod** — Type-safe schemas for client and server
3. **Server-side validation** — Never trust client-side only
4. **Show clear errors** — Inline errors near fields
5. **Accessible forms** — Labels, aria attributes, error IDs
6. **Handle loading states** — Disable submit, show progress
7. **Provide feedback** — Toast for success, inline for errors
8. **Validate incrementally** — On blur or change with debounce
9. **File upload validation** — Type, size, sanitize filename
10. **Use FormData** — For server actions with file uploads

---

_Next: [Environment](./16-environment.md)_
