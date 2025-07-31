# Markdown Utilities

This directory contains utilities for rendering Markdown content safely in different environments.

## Files

### `markdown.ts`
Server-safe markdown renderer that doesn't require DOMPurify. This is perfect for:
- Email templates (SSR)
- Server-side rendering
- Any context where DOMPurify isn't available

### Usage Examples

#### In Email Templates (Server-side)
```tsx
import { renderMarkdownForEmail } from '@/lib/utils/markdown'

const emailContent = renderMarkdownForEmail('# Hello\n\nThis is **bold** text.')
```

#### In React Components (Client-side)
```tsx
import MarkdownContent from '@/components/ui/html-content'

// Full client-side sanitization with DOMPurify
<MarkdownContent content="# Hello World" />

// Server-safe mode (less secure but works in SSR)
<MarkdownContent content="# Hello World" serverSafe={true} />
```

## Security Notes

- `renderMarkdownForEmail` provides basic sanitization suitable for controlled content
- `MarkdownContent` with DOMPurify provides comprehensive XSS protection
- Use `serverSafe={true}` only when you trust the markdown content source
