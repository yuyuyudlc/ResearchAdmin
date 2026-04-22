# Project Rules

## React Router

1. `src/app.tsx` 只用于路由配置，不写页面业务逻辑。
2. 路由配置使用config进行配置。

## 页面目录规则

1. 所有页面放在 `src/pages` 下。
2. 一个页面对应一个文件夹：`src/pages/<PageName>/`。
3. 页面目录固定包含：
   - `index.tsx`：页面入口组件
   - `hooks/`：页面级 hooks（如 `useHome.ts`）
   - `style/`：页面级样式（如 `index.module.scss`）
   - `components/`：页面内组件

## 页面内组件目录规则

1. `components` 下每个组件必须是独立文件夹：`src/pages/<PageName>/components/<ComponentName>/`。
2. 每个组件目录固定包含：
   - `index.tsx`：组件入口
   - `hooks/`：组件内部 hooks（如 `useHeader.ts`）
   - `style/`：组件内部样式（如 `index.module.scss`）

## 参考结构

```txt
src/
├─ app.tsx
├─ pages/
│  └─ Home/
│     ├─ index.tsx
│     ├─ hooks/
│     │  └─ useHome.ts
│     ├─ style/
│     │  └─ index.module.scss
│     └─ components/
│        └─ Header/
│           ├─ index.tsx
│           ├─ hooks/
│           │  └─ useHeader.ts
│           └─ style/
│              └─ index.module.scss
```
