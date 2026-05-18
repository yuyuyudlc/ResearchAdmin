---
name: research-admin-frontend
description: Use when developing or refactoring the ResearchAdmin frontend, especially React routes, workspace/document UX, antd business components, Tiptap rich text editing, page structure, services, hooks, and project design rules under Frontend/rules.
---

# ResearchAdmin Frontend

## Core Rules

- Use `Frontend/rules/rules.md` as the source of engineering and business component conventions.
- Use `Frontend/rules/Design.md` as the source of visual style and design-token intent.
- Business UI controls use `antd`: forms, tables, modals, buttons, inputs, tabs, menus, dropdowns, upload, pagination, tooltip, empty, result, spin, message, and notification.
- Rich text editing uses `tiptap`. Do not build document body editing with raw `contentEditable`.
- Keep route responsibilities strict:
  - `/workspaces`: workspace cards, workspace CRUD, workspace members, workspace-level settings.
  - `/documents/:documentId`: document content, document toolbar, document metadata, document permissions, move/archive/delete/download.

## Workflow

1. Read the relevant existing code before changing behavior.
2. For page or component work, check `references/project-rules.md` and the live `Frontend/rules/rules.md`.
3. For visual or layout decisions, check `references/design.md` and the live `Frontend/rules/Design.md`.
4. Prefer established project directories:
   - `src/pages/<PageName>/index.tsx`
   - `src/pages/<PageName>/hooks/use<PageName>.ts`
   - `src/pages/<PageName>/components/<ComponentName>/`
   - `src/pages/<PageName>/style/index.module.css`
5. Keep API access in `src/services`, not inline in JSX.
6. Keep page components mostly compositional; put state transitions and requests in hooks.
7. Validate with `pnpm build` after meaningful frontend changes.

## References

- `references/project-rules.md`: project engineering rules mirrored from `Frontend/rules/rules.md`.
- `references/design.md`: design style reference mirrored from `Frontend/rules/Design.md`.
