---

# Review Checklist

Use this comprehensive checklist before submitting your project to Envato or before any major release. This ensures your code meets industry standards and marketplace requirements.

---

## Table of Contents

1. [Code Quality](#code-quality)
2. [TypeScript](#typescript)
3. [React & Next.js](#react--nextjs)
4. [Performance](#performance)
5. [Security](#security)
6. [Accessibility](#accessibility)
7. [Documentation](#documentation)
8. [Testing](#testing)
9. [Envato-Specific Requirements](#envato-specific-requirements)

---

## Code Quality

### Linting & Formatting

- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Prettier formatting applied consistently
- [ ] No `eslint-disable` comments without justification
- [ ] No `@ts-ignore` or `@ts-expect-error` without comments

### Code Style

- [ ] Consistent naming conventions followed
  - [ ] camelCase for variables and functions
  - [ ] PascalCase for components and types
  - [ ] UPPER_SNAKE_CASE for constants
- [ ] All semicolons present (or consistent if omitting)
- [ ] Trailing commas used consistently
- [ ] Imports organized and sorted
- [ ] No unused imports or variables
- [ ] No commented-out code (except for documentation)

### Functions

- [ ] Functions are focused (single responsibility)
- [ ] Functions are < 50 lines (most cases)
- [ ] No more than 3 levels of nesting
- [ ] Parameters limited (≤ 4, or use options object)
- [ ] Pure functions where possible

### Prohibited Patterns

- [ ] No `eval()` or `new Function()`
- [ ] No `var` declarations (use `const` or `let`)
- [ ] No `any` type without justification
- [ ] No `console.log` in production code
- [ ] No global namespace pollution
- [ ] No native object prototype extensions

---

## TypeScript

### Configuration

- [ ] Strict mode enabled (`"strict": true`)
- [ ] `noUncheckedIndexedAccess` enabled
- [ ] `exactOptionalPropertyTypes` enabled
- [ ] Path aliases configured (`@/*`)

### Type Safety

- [ ] No `any` types (use `unknown` if needed)
- [ ] All function parameters typed
- [ ] All return types explicit for public APIs
- [ ] Generics used appropriately
- [ ] Union types discriminated where applicable

### Types Organization

- [ ] Types in dedicated files or colocated
- [ ] Interfaces for object shapes
- [ ] Type aliases for unions and complex types
- [ ] Enums avoided (use const objects or unions)
- [ ] Utility types used effectively

### Type Coverage

- [ ] API responses fully typed
- [ ] Form data typed with Zod inference
- [ ] Database models typed with Prisma
- [ ] Third-party library types installed

---

## React & Next.js

### Component Patterns

- [ ] Server Components used by default
- [ ] Client Components only when needed (marked with `'use client'`)
- [ ] Components are properly memoized where beneficial
- [ ] Props are destructured with defaults
- [ ] Children pattern used for composition

### Hooks

- [ ] Rules of Hooks followed
- [ ] Custom hooks extracted for reusable logic
- [ ] Dependencies arrays correct in useEffect/useMemo/useCallback
- [ ] No missing dependencies warnings
- [ ] Cleanup functions provided in useEffect

### Data Fetching

- [ ] Data fetched in Server Components where possible
- [ ] Suspense boundaries implemented
- [ ] Loading states handled
- [ ] Error boundaries in place
- [ ] Proper caching strategies used

### Routing

- [ ] App Router patterns followed
- [ ] Route groups organized logically
- [ ] Loading and error files provided
- [ ] Metadata configured for SEO
- [ ] Dynamic routes validated

### Server Actions

- [ ] Zod validation on all inputs
- [ ] Error handling with proper responses
- [ ] Revalidation after mutations
- [ ] Progressive enhancement considered

---

## Performance

### Bundle Size

- [ ] No unnecessary dependencies
- [ ] Dynamic imports for large components
- [ ] Tree shaking working (no barrel file issues)
- [ ] Bundle analyzed (`npm run build:analyze`)
- [ ] No duplicate polyfills

### Images & Media

- [ ] `next/image` used for images
- [ ] Proper sizing and formats (WebP/AVIF)
- [ ] Lazy loading enabled
- [ ] Priority set for above-fold images
- [ ] Alt text provided

### Rendering

- [ ] No unnecessary re-renders
- [ ] Keys used correctly in lists
- [ ] Large lists virtualized
- [ ] Expensive computations memoized

### Core Web Vitals

- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB optimized
- [ ] INP < 200ms

### Caching

- [ ] API responses cached appropriately
- [ ] Static assets have long cache TTL
- [ ] Revalidation strategies defined
- [ ] CDN caching configured

---

## Security

### Authentication

- [ ] Sessions stored securely (httpOnly cookies)
- [ ] Password hashing with bcrypt (12+ rounds)
- [ ] Rate limiting on auth endpoints
- [ ] Session expiration implemented
- [ ] Secure password requirements

### Authorization

- [ ] RBAC implemented correctly
- [ ] API routes protected
- [ ] Server Actions verified
- [ ] No privilege escalation possible

### Input Validation

- [ ] All inputs validated server-side
- [ ] Zod schemas for all forms
- [ ] File uploads validated (type, size)
- [ ] SQL injection prevented (Prisma)

### XSS Prevention

- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] User content escaped
- [ ] CSP headers configured
- [ ] URL validation for links

### Data Protection

- [ ] Secrets in environment variables
- [ ] No secrets in client code
- [ ] API responses filtered
- [ ] Error messages don't expose internals
- [ ] Logs sanitized (no sensitive data)

### Headers & CORS

- [ ] Security headers set
- [ ] CORS configured properly
- [ ] SameSite cookies enabled
- [ ] HTTPS enforced

---

## Accessibility

### Semantic HTML

- [ ] Proper heading hierarchy (h1-h6)
- [ ] Landmark regions used (header, main, nav, footer)
- [ ] Lists used for lists
- [ ] Tables for tabular data
- [ ] Buttons for actions, links for navigation

### Keyboard Navigation

- [ ] All interactive elements focusable
- [ ] Visible focus indicators
- [ ] Tab order logical
- [ ] No keyboard traps
- [ ] Skip links provided

### ARIA

- [ ] ARIA used only when HTML is insufficient
- [ ] Labels for all form inputs
- [ ] Roles used correctly
- [ ] Live regions for dynamic content
- [ ] States (expanded, selected, etc.) announced

### Visual

- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Color not sole indicator
- [ ] Content readable at 200% zoom
- [ ] Reduced motion respected

### Forms

- [ ] Labels associated with inputs
- [ ] Error messages linked to fields
- [ ] Required fields indicated
- [ ] Success/error states accessible

### Testing

- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Keyboard-only navigation tested
- [ ] Automated a11y tests pass (axe)

---

## Documentation

### Code Documentation

- [ ] TSDoc used for public APIs
- [ ] Complex logic commented
- [ ] TODO/FIXME have ticket references
- [ ] No outdated comments

### Project Documentation

- [ ] README complete and current
- [ ] Installation steps work
- [ ] Environment variables documented
- [ ] API documented
- [ ] Changelog maintained

### Envato Documentation

- [ ] Item description complete
- [ ] Features listed clearly
- [ ] Requirements stated
- [ ] Demo link working
- [ ] Screenshots current

---

## Testing

### Unit Tests

- [ ] Utility functions tested
- [ ] Custom hooks tested
- [ ] Critical business logic covered
- [ ] Edge cases tested

### Component Tests

- [ ] Key components tested
- [ ] User interactions tested
- [ ] Error states tested
- [ ] Accessibility tested

### Integration Tests

- [ ] API routes tested
- [ ] Database operations tested
- [ ] Authentication flows tested

### E2E Tests

- [ ] Critical user journeys covered
- [ ] Forms submission tested
- [ ] Authentication tested
- [ ] Responsive design tested

### Coverage

- [ ] Statements: ≥80%
- [ ] Branches: ≥80%
- [ ] Functions: ≥80%
- [ ] Lines: ≥80%

---

## Envato-Specific Requirements

### Code Requirements

- [ ] Well-commented code
- [ ] No minified/obfuscated source files
- [ ] Clean file/folder structure
- [ ] No console errors or warnings
- [ ] Works in latest Chrome, Firefox, Safari, Edge

### Documentation Requirements

- [ ] Comprehensive documentation included
- [ ] Step-by-step installation guide
- [ ] Configuration options documented
- [ ] Customization guide provided
- [ ] Support email/contact provided

### Demo Requirements

- [ ] Live demo available
- [ ] Demo shows all features
- [ ] Demo data looks realistic
- [ ] Demo is responsive
- [ ] Demo loads quickly

### Legal Requirements

- [ ] All assets properly licensed
- [ ] Third-party licenses listed
- [ ] No copyrighted material
- [ ] Original work declaration

### Package Contents

- [ ] Source files included
- [ ] Documentation folder
- [ ] License file
- [ ] Changelog
- [ ] Support info

---

## Quick Pre-Submit Commands

```bash
# Run all checks
npm run lint
npm run type-check
npm run test
npm run build
npm run test:e2e

# Analyze bundle
npm run build:analyze

# Accessibility audit
npm run test:a11y

# Security audit
npm audit

# Generate documentation
npm run docs:generate
```

---

## Submission Checklist Summary

### Required

- [ ] Clean, well-documented code
- [ ] Full documentation
- [ ] Working demo
- [ ] Responsive design
- [ ] Cross-browser compatibility
- [ ] Proper licensing

### Recommended

- [ ] TypeScript strict mode
- [ ] 80%+ test coverage
- [ ] WCAG AA accessibility
- [ ] Core Web Vitals passing
- [ ] Security headers configured
- [ ] Error tracking setup

---

## Final Review

Before submitting, ask yourself:

1. **Would I be proud to show this code to senior developers?**
2. **Can a developer understand this project in 10 minutes?**
3. **Are all the features working as documented?**
4. **Is the design polished and professional?**
5. **Have I tested on different devices and browsers?**

If you can answer "yes" to all these questions, you're ready to submit!

---

_Back to: [Introduction](./01-introduction.md)_
