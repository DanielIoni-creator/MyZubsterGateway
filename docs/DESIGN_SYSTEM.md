# MyZubsterGateway — Design System

## Overview

This design system provides a consistent visual language for the MyZubsterGateway
dashboard and all customer-facing interfaces. It is built on CSS custom properties
(design tokens) and reusable component classes — no JavaScript framework required.

## Quick Start

Link the stylesheets in your HTML:

```html
<link rel="stylesheet" href="/css/design-tokens.css">
<link rel="stylesheet" href="/css/ui-components.css">
```

Or import in your CSS:

```css
@import '/css/design-tokens.css';
@import '/css/ui-components.css';
```

## Color System

The palette uses a 9-step scale inspired by Open Color, with semantic naming:

| Token | Usage |
|-------|-------|
| `--color-primary-*` | Brand blue — primary actions, links, focus states |
| `--color-accent-*` | MYZ Gold — highlights, CTAs, bounty indicators |
| `--color-gray-*` | Neutrals — backgrounds, borders, text |
| `--color-success` | Green — confirmed orders, completed bounties |
| `--color-warning` | Orange — pending actions, attention needed |
| `--color-error` | Red — failed operations, validation errors |
| `--color-info` | Blue — informational messages |

### Usage Example

```css
.my-component {
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  color: var(--color-primary-800);
}
```

## Typography

| Token | Size | Usage |
|-------|------|-------|
| `--font-size-xs` | 12px | Badges, tooltips, fine print |
| `--font-size-sm` | 14px | Body text, form labels |
| `--font-size-base` | 16px | Default body |
| `--font-size-lg` | 18px | Lead paragraphs |
| `--font-size-xl` | 20px | Section headings |
| `--font-size-2xl` | 24px | Card titles |
| `--font-size-3xl` | 30px | Page headings |
| `--font-size-4xl` | 36px | Hero titles |

Font stack: Inter (primary), JetBrains Mono (code). System fallbacks included.

## Spacing

All spacing uses a 4px base unit (0.25rem increments):

| Token | Size | Usage |
|-------|------|-------|
| `--space-1` | 4px | Micro gaps |
| `--space-2` | 8px | Icon padding |
| `--space-3` | 12px | Button padding (small) |
| `--space-4` | 16px | Standard padding |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section gaps |
| `--space-12` | 48px | Page margins |

## Components

### Buttons

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-accent">Accent</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-danger">Danger</button>
```

Sizes: `.btn-sm`, default, `.btn-lg`
States: `:hover`, `:active`, `:disabled`, `:focus-visible`

### Cards

```html
<div class="card">
  <div class="card-header">Title</div>
  <div class="card-body">Content goes here</div>
  <div class="card-footer">Actions</div>
</div>
```

### Form Inputs

```html
<div class="form-group">
  <label class="form-label">Email</label>
  <input class="form-input" type="email" placeholder="you@example.com">
  <span class="form-error">Invalid email</span>
</div>
```

### Tables

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th></tr></thead>
  <tbody><tr><td>Order #1</td><td><span class="badge badge-success">Done</span></td></tr></tbody>
</table>
```

### Alerts

```html
<div class="alert alert-success">Operation completed successfully.</div>
<div class="alert alert-warning">Your session expires in 5 minutes.</div>
<div class="alert alert-error">Failed to process payment.</div>
<div class="alert alert-info">New bounty available: 500 MYZ.</div>
```

### Loading States

```html
<!-- Spinner -->
<div class="spinner"></div>

<!-- Skeleton -->
<div class="skeleton" style="width:200px;height:20px"></div>
```

## Dark Mode

Add `data-theme="dark"` to `<html>` to activate dark mode. All components
automatically adapt via CSS custom property overrides.

```html
<html data-theme="dark">
```

Toggle with JavaScript:

```js
const toggle = () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark');
};

// Restore on load
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
```

## Accessibility

- All interactive elements have visible `:focus-visible` outlines (2px primary-500)
- `.sr-only` class for screen-reader-only content
- Minimum contrast ratio 4.5:1 for text (verified against WCAG AA)
- Form inputs have associated labels
- Interactive elements are keyboard navigable

## Best Practices

1. **Always use tokens**, never hardcode colors:
   ```css
   /* ✅ Good */
   color: var(--color-primary-700);
   /* ❌ Bad */
   color: #4263eb;
   ```

2. **Compose utility classes** rather than writing custom CSS:
   ```html
   <div class="flex items-center gap-3">...</div>
   ```

3. **Test in both themes** — ensure all content is readable in dark mode.

4. **Mobile-first**: components are responsive by default using relative units.
