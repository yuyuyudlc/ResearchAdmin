# Project Rules

## 技术选型

1. 业务组件统一采用 `antd`。
   - 表单、表格、弹窗、按钮、输入框、选择器、Tabs、Menu、Dropdown、Tooltip、Upload、Pagination、Empty、Spin、Result、Message、Notification 优先使用 antd。
   - 不手写基础业务控件，除非 antd 不能覆盖该交互。
   - 页面可以封装业务组件，但底层控件优先组合 antd。
2. 富文本编辑器统一采用 `tiptap`。
   - 文档正文编辑、协同编辑、块级工具栏、编辑器扩展都基于 tiptap。
   - 不使用原生 `contentEditable` 直接实现文档正文编辑。
3. 全局 UI 风格通过 antd `ConfigProvider` theme token 和 `Frontend/rules/Design.md` 控制。
4. 页面布局和局部业务样式使用 CSS Modules。
5. 前端包管理统一使用 `pnpm`，不要使用 `npm install` 或提交 npm lockfile 变更。

## React Router

1. `src/app.tsx` 只用于路由配置，不写页面业务逻辑。
2. 路由配置使用config进行配置。
3. 路由必须表达清晰的业务职责：
   - `/workspaces`：工作区卡片、工作区增删改查、成员管理、空间级设置。
   - `/documents/:documentId`：文档内容、文档工具栏、文档级权限、移动、删除、下载、协同编辑状态。
4. 不在 workspace 路由里承载文档编辑器；不在 documents 路由里承载 workspace 管理。

## 页面目录规则

1. 所有页面放在 `src/pages` 下。
2. 一个页面对应一个文件夹：`src/pages/<PageName>/`。
3. 页面目录固定包含：
   - `index.tsx`：页面入口组件
   - `hooks/`：页面级 hooks（如 `useHome.ts`）
   - `style/`：页面级样式（如 `index.module.css`）
   - `components/`：页面内组件
4. `index.tsx` 只负责页面拼装和轻量事件绑定；复杂请求、状态流转放到 hooks。
5. API 请求只能通过 `src/services` 调用，不在组件中直接写 `fetch`。

## 页面内组件目录规则

1. `components` 下每个组件必须是独立文件夹：`src/pages/<PageName>/components/<ComponentName>/`。
2. 每个组件目录固定包含：
   - `index.tsx`：组件入口
   - `hooks/`：组件内部 hooks（如 `useHeader.ts`）
   - `style/`：组件内部样式（如 `index.module.css`）

## 业务状态规则

1. 页面必须显式处理 `loading`、`empty`、`error` 状态。
2. 删除、归档、移动、权限变更等高风险操作必须二次确认。
3. workspace owner/member、document read/edit/manage 权限判断统一通过 helper 或 hook，避免在 JSX 中散写权限位计算。
4. 表单提交必须有处理中状态，避免重复提交。

## 样式规则

1. 视觉风格以 `Frontend/rules/Design.md` 为准。
2. antd 主题统一在全局入口 `ConfigProvider` 配置。
3. 避免全局覆盖 `.ant-*`。确需覆盖时，放在页面或组件局部作用域下。
4. 页面内不要硬编码大量重复颜色、圆角、阴影；优先复用 Design token 或 antd token。

## 图标规则

1. **禁止使用 emoji** 作为任何 UI 图标。包括但不限于 `📁 📄 📊 🏠 👤 👥 🔍 ⚙ ↻ ▾ ▸ ⋯ ＋` 等。
   - 同样禁止使用 Unicode 几何字符（如 `▾`、`▸`、`■`、`●`）做图标。
   - 文案中的 emoji（用户内容、复制的原文）不在此限，仅限 UI 视觉元素。
2. **统一通过 `src/components/Icon.tsx` 使用图标**。
   - 业务代码引用：`import Icon from '@/components/Icon'`，使用 `<Icon name="..." />`。
   - 该组件基于 `@iconify/react`，内部维护 `IconName → iconify 名称` 的映射表。
   - 新增图标统一在 `Icon.tsx` 的 `IconName` 类型 + `ICON_MAP` 添加映射，**业务文件不直接写 iconify 字符串**。
3. **图标库选型**：优先使用 `solar:` 线性风格图标集；当 `solar:` 缺失时使用 `mdi:`。除非有强烈视觉需要，不混入其他图标集。
4. **antd 组件的 `icon` 属性**统一传 `<Icon name="..." size={14} />`，不传 emoji 或字符串。
5. **hover 才显示的图标按钮**必须用绝对定位浮在容器右侧（不能用 flex 占位），避免 hover 时挤压标题/内容引起布局抖动；参考 `DocumentTree`、`Sidebar` 的实现。
6. **图标颜色**通过 `color` prop 或外层 `color` CSS 控制；不通过修改 SVG 内嵌色实现主题色切换。

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
│     │  └─ index.module.css
│     └─ components/
│        └─ Header/
│           ├─ index.tsx
│           ├─ hooks/
│           │  └─ useHeader.ts
│           └─ style/
│              └─ index.module.css
```
