# 科研项目文档管理系统后端技术规约说明书 (Backend TRD)

## 1. 系统架构与双服务协同设计

后端系统采用了 **Go RESTful 服务** 与 **Node.js 协同消息服务** 的双引擎协作模式，在架构设计上实现职责完全隔离：

```
                    ┌──────────────────────────────┐
                    │      React Client (Vite)     │
                    └──────────────┬───────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │ REST API                            │ WebSocket (y-websocket)
                ▼                                     ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│       Go Backend (Gin)       │       │    Node.js Collab Server     │
│        (Port: 8080)          │◄──────│         (Port: 3001)         │
└──────────────┬───────────────┘  PUT  └──────────────────────────────┘
               │                /body
               ▼
┌──────────────────────────────┐
│      SQLite (test.db)        │
└──────────────────────────────┘
```

- **Go 主服务 (Port 8080)**：
  - 核心职责：负责用户认证、组织架构管理、工作区管理、文档元数据 CRUD、细粒度 ACL 鉴权、历史快照保存与回滚、审计日志存取。
  - 技术选型：Gin Web 框架 + GORM 2.0 ORM + JWT 会话管理。
- **Node.js 协同服务 (Port 3001)**：
  - 核心职责：建立基于 WebSocket 的 CRDT 实时消息分发网关，维护驻留内存的 `Y.Doc` 对象副本，负责多在线用户间的增量冲突合并与光标 Awareness 状态同步。
  - 技术选型：`ws` 库 + `y-websocket` + `yjs`。
  - **解耦持久化机制 (Flush)**：Node 服务在运行中并不直接连接 SQLite 数据库，而是周期性（防抖间隔 1s，或累积 5 次更新）或在连接断开前，将合并好的全量 `Y.Doc` 二进制快照（`octet-stream`），通过 HTTP PUT 接口（`/api/v1/documents/:documentId/body`）写回 Go 后端，由 Go 后端写入 SQLite，达成内存高频计算、数据库低频落盘的高性能架构。

---

## 2. 数据库关系与数据模型 (SQLite/GORM)

系统基于 SQLite 作为底层数据库，通过 GORM 进行对象模型映射。以下是实体间的核心表结构定义：

### 2.1 用户表 (`users`)
映射 GORM 实体：`domain.User`
- `id` (char(36), 主键, UUID v4)：用户唯一标识。
- `username` (varchar(255), 非空)：登录用户名。
- `email` (varchar(255), 唯一索引)：电子邮箱。
- `display_name` (varchar(64))：现实显示名。
- `avatar_url` (text)：头像储存链接。
- `signature` (text)：个性签名。
- `professional_title` (varchar(32))：职称（枚举值：`professor`, `lecturer`, `doctoral_student`, `master_student`, `researcher`, `engineer` 等）。
- `supervisor` (varchar(255))：导师姓名。
- `status` (varchar(32), 默认 `active`)：账户状态（`active` / `disabled`）。
- `password_hash` (varchar(255), 排除 JSON 序列化)：密码哈希。
- `last_login_at` (datetime, 可为空)：上次登录时间。

### 2.2 工作区表 (`workspaces`)
映射 GORM 实体：`domain.Workspace`
- `id` (char(36), 主键, UUID v4)：工作区标识。
- `name` (varchar(128), 非空)：工作区/项目名称。
- `description` (text)：项目描述。
- `owner_user_id` (char(36), 索引)：创建者用户 ID。
- `status` (varchar(32), 默认 `active`, 索引)：状态（`active` / `deleted`）。

### 2.3 工作区成员表 (`workspace_members`)
映射 GORM 实体：`domain.WorkspaceMember`
- `id` (char(36), 主键, UUID v4)：关联 ID。
- `workspace_id` (char(36), 联合唯一索引 `idx_workspace_member`)：所属工作区 ID。
- `user_id` (char(36), 联合唯一索引 `idx_workspace_member`)：关联用户 ID。
- `role` (varchar(32))：角色（`owner` 或 `member`）。

### 2.4 文档树表 (`documents`)
映射 GORM 实体：`domain.Document`
- `id` (char(36), 主键, UUID v4)：文档唯一标识。
- `workspace_id` (char(36), 联合索引 `idx_documents_parent_sort` 第一位)：所属工作区 ID。
- `parent_id` (char(36), 可为空, 联合索引 `idx_documents_parent_sort` 第二位)：父节点 ID。为空代表工作区根文档。
- `title` (varchar(255), 非空)：文档标题。
- `summary` (text)：文档摘要描述。
- `owner_user_id` (char(36))：创建者用户 ID。
- `doc_type` (varchar(32))：文档类型（`rich_text` 或 `file`）。
- `status` (varchar(32), 默认 `active`)：状态（`active` / `archived` / `deleted`）。
- `sort_order` (int, 默认 1000, 联合索引 `idx_documents_parent_sort` 第三位)：树节点排序权重。
- `source_storage_key` (varchar(255))：若为文件类型，其外部对象存储 Key。

### 2.5 访问控制控制表 (`doc_acl`)
映射 GORM 实体：`domain.DocACL`（表名：`doc_acl`）
- `id` (char(36), 主键, UUID v4)：规则主键。
- `workspace_id` (char(36), 索引)：冗余所属工作区 ID。
- `document_id` (char(36), 联合唯一索引 `idx_doc_acl_subject` 第一位)：绑定的目标文档 ID。
- `subject_type` (varchar(32), 联合唯一索引 `idx_doc_acl_subject` 第二位)：授权主体类型（`user` 个人，或 `public` 所有人）。
- `subject_id` (char(36), 可为空, 联合索引 `idx_doc_acl_subject` 第三位)：授权主体的 ID。若为 `public`，该值为空。
- `permission_bit` (int, 非空)：权限掩码位图值。
- `inherit` (bool, 默认 false)：该规则是否允许被子文档节点向下继承。
- `created_by` (char(36))：授权操作人用户 ID。

### 2.6 文档正文表 (`document_bodies`)
映射 GORM 实体：`domain.DocumentBody`（表名：`document_bodies`）
- `id` (char(36), 主键, UUID v4)：主键。
- `document_id` (char(36), 唯一索引)：关联文档 ID。
- `body_type` (varchar(32))：正文编码类型（默认为 `yjs_state`）。
- `data` (blob, 排除 JSON 序列化)：Yjs 序列化后的全量二进制快照。
- `size` (bigint)：数据包大小字节数。

---

## 3. RESTful API 基础约定与统一响应

### 3.1 路径前缀与鉴权
- **统一前缀**：`/api/v1`
- **非保护接口**：登录（`/api/v1/auth/login`）和注册（`/api/v1/auth/register`）不需要登录，其余所有 `/api/v1` 业务接口均需携带 JWT Token（格式 `Authorization: Bearer {token}`）。

### 3.2 统一响应格式
除二进制数据接口外，后端一律返回以下 JSON 数据结构：
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```
**错误响应示例**：
```json
{
  "code": 403,
  "message": "无权限",
  "data": null
}
```
*注：成功时 `code` 固定为 `0`；失败时 `code` 使用 HTTP 状态码表示（如 `400`、`401`、`403`、`404`、`409`、`500`）。所有主键 ID 统一采用标准的 36 位 UUID 字符串，前端不得做数字转换。*

---

## 4. RESTful 接口详细规范

### 4.1 认证模块 (Auth)

#### 4.1.1 登录账号
- **方法与路径**：`POST /api/v1/auth/login`
- **请求体 (Payload)**：
  ```json
  {
    "email": "alice@example.com",
    "password": "123456"
  }
  ```
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "accessToken": "jwt-token-string",
      "expiresIn": 7200,
      "user": {
        "id": "0192e6f7-2f4b-4f35-8e9b-9b6f7a7f2c10",
        "username": "alice",
        "email": "alice@example.com",
        "organization": "智能计算实验室",
        "avatarUrl": "https://example.com/avatars/alice.png",
        "signature": "专注科研文档协作与知识管理",
        "professionalTitle": "researcher",
        "supervisor": "张教授",
        "displayName": "Alice"
      }
    }
  }
  ```

#### 4.1.2 注册账号
- **方法与路径**：`POST /api/v1/auth/register`
- **请求体 (Payload)**：
  ```json
  {
    "username": "alice",
    "email": "alice@example.com",
    "password": "123456",
    "organization": "智能计算实验室",
    "avatar_url": "https://example.com/avatars/alice.png",
    "signature": "专注科研文档协作与知识管理",
    "professional_title": "researcher",
    "supervisor": "张教授"
  }
  ```
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "message": "注册成功"
    }
  }
  ```

#### 4.1.3 修改当前账号密码（需要登录）
- **方法与路径**：`PUT /api/v1/auth/password`
- **请求体 (Payload)**：
  ```json
  {
    "old_password": "123456",
    "new_password": "new123456"
  }
  ```
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "message": "密码修改成功"
    }
  }
  ```

#### 4.1.4 更新个人画像资料（需要登录）
- **方法与路径**：`PUT /api/v1/auth/profile`
- **请求体 (Payload)**：
  ```json
  {
    "username": "alice",
    "email": "alice@example.com",
    "organization": "智能计算实验室",
    "avatar_url": "https://example.com/avatars/alice.png",
    "signature": "专注科研文档协作与知识管理",
    "professional_title": "researcher",
    "supervisor": "张教授"
  }
  ```
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "message": "个人信息修改成功"
    }
  }
  ```

#### 4.1.5 模糊搜索用户（需要登录）
- **方法与路径**：`GET /api/v1/users/search`
- **查询参数 (Query Parameter)**：
  - `q` (string, 必填)：搜索关键字。模糊匹配用户名、邮箱、显示名称。
- **业务逻辑**：对关键字进行两端去空，若为空则直接返回空列表。模糊搜索所有匹配且状态为 `active` 的用户，并对响应字段进行脱敏，仅返回公开属性。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": [
      {
        "id": "0192e6f7-2f4b-4f35-8e9b-9b6f7a7f2c10",
        "username": "alice",
        "email": "alice@example.com",
        "organizationId": "3498d28a-8a5f-4cd1-92b1-561b369c3a3b",
        "organization": "智能计算实验室",
        "avatarUrl": "https://example.com/avatars/alice.png",
        "signature": "专注科研文档协作与知识管理",
        "professionalTitle": "researcher",
        "supervisor": "张教授",
        "displayName": "Alice",
        "status": "active"
      }
    ]
  }
  ```

---

### 4.2 科研工作区模块 (Workspace)

#### 4.2.1 创建项目工作区
- **方法与路径**：`POST /api/v1/workspaces`
- **请求体 (Payload)**：
  ```json
  {
    "name": "深度学习科研组",
    "description": "存放深度学习项目相关的所有实验数据与汇报文档"
  }
  ```
- **业务逻辑**：在 `workspaces` 中增加一条记录，并自动在 `workspace_members` 表中为当前用户生成一条角色为 `owner` 的空间管理关联记录。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "workspace-uuid-v4",
      "name": "深度学习科研组",
      "description": "存放深度学习项目相关的所有实验数据与汇报文档",
      "ownerUserId": "user-uuid-v4",
      "status": "active",
      "createdAt": "2026-05-20T16:00:00Z",
      "updatedAt": "2026-05-20T16:00:00Z"
    }
  }
  ```

#### 4.2.2 列出当前用户加入的全部工作区
- **方法与路径**：`GET /api/v1/workspaces`
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "items": [
        {
          "id": "workspace-uuid-v4",
          "name": "深度学习科研组",
          "description": "存放深度学习项目相关的所有实验数据与汇报文档",
          "ownerUserId": "user-uuid-v4",
          "role": "owner",
          "status": "active",
          "createdAt": "2026-05-20T16:00:00Z",
          "updatedAt": "2026-05-20T16:00:00Z"
        }
      ]
    }
  }
  ```

#### 4.2.3 加载/获取工作区树状目录子节点 (带分页游标)
- **方法与路径**：`GET /api/v1/workspaces/:workspaceId`
- **查询参数 (Query)**：
  - `parentId`：父节点 ID。如果为空或不传，则代表获取工作区的**第一层根文档**。
  - `status`：状态过滤（默认 `active`）。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "workspace": {
        "id": "workspace-uuid-v4",
        "name": "深度学习科研组",
        "description": "存放深度学习项目相关的所有实验数据与汇报文档",
        "ownerUserId": "user-uuid-v4",
        "status": "active"
      },
      "currentMember": {
        "userId": "user-uuid-v4",
        "role": "owner"
      },
      "parent": {
        "id": "doc-parent-uuid-v4",
        "title": "项目第一阶段需求",
        "permissionBit": 7
      },
      "items": [
        {
          "id": "doc-child-uuid-v4",
          "workspaceId": "workspace-uuid-v4",
          "parentId": "doc-parent-uuid-v4",
          "title": "实验数据集规范描述",
          "summary": "包含所有科研数据格式规范描述",
          "ownerUserId": "user-uuid-v4",
          "docType": "rich_text",
          "status": "active",
          "sortOrder": 1000,
          "permissionBit": 7,
          "hasChildren": false,
          "createdAt": "2026-05-20T16:00:00Z",
          "updatedAt": "2026-05-20T16:00:00Z"
        }
      ],
      "nextCursor": null
    }
  }
  ```
  *注：若 `parent` 字段为 `null`，代表当前查询的是根级目录；字段 `hasChildren` 用于协助前端判定是否渲染展开层级箭头。*

#### 4.2.4 更新工作区元数据
- **方法与路径**：`PATCH /api/v1/workspaces/:workspaceId`
- **请求体 (Payload)**：允许更新 `name`、`description` 和 `status`。
- **权限要求**：仅限 `workspace owner`。

#### 4.2.5 删除工作区 (软删除)
- **方法与路径**：`DELETE /api/v1/workspaces/:workspaceId`
- **权限要求**：仅限 `workspace owner`。会将 `status` 变更为 `deleted`。

---

### 4.3 工作区成员模块 (Workspace Member)

#### 4.3.1 获取工作区内全部成员
- **方法与路径**：`GET /api/v1/workspaces/:workspaceId/members`
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "items": [
        {
          "userId": "user-1-uuid",
          "role": "owner",
          "joinedAt": "2026-05-20T16:00:00Z"
        },
        {
          "userId": "user-2-uuid",
          "role": "member",
          "joinedAt": "2026-05-20T16:05:00Z"
        }
      ]
    }
  }
  ```

#### 4.3.2 引入新的成员到工作区
- **方法与路径**：`POST /api/v1/workspaces/:workspaceId/members`
- **请求体 (Payload)**：
  ```json
  {
    "userId": "user-2-uuid",
    "role": "member"
  }
  ```
- **权限要求**：仅限 `workspace owner`。添加角色限定在 `owner` 或 `member`。

#### 4.3.3 修改工作区内成员的级别角色
- **方法与路径**：`PATCH /api/v1/workspaces/:workspaceId/members/:userId`
- **请求体 (Payload)**：
  ```json
  {
    "role": "owner"
  }
  ```
- **约束规则**：禁止使工作区陷入“无任何 Owner 托管”的安全风险。

#### 4.3.4 将成员移出工作区
- **方法与路径**：`DELETE /api/v1/workspaces/:workspaceId/members/:userId`
- **权限要求**：仅限 `workspace owner`。不允许开除空间内最后一名拥有者。

---

### 4.4 文档管理模块 (Document)

#### 4.4.1 创建新文档
- **方法与路径**：`POST /api/v1/workspaces/:workspaceId/documents`
- **请求体 (Payload)**：
  ```json
  {
    "parentId": "doc-parent-uuid-v4",
    "title": "新建科研草稿",
    "summary": "摘要描述描述",
    "docType": "rich_text"
  }
  ```
  *(如果 `parentId` 为 `null` 或空字符串，则代表直接在工作区根节点下创建文档。)*
- **权限要求**：对所在工作区拥有 `WorkspaceMemberRole` 或在特定父文档下具有 `EDIT` 权限位。

#### 4.4.2 上传具体科研实体文件 (创建非富文本型文档)
- **方法与路径**：`POST /api/v1/workspaces/:workspaceId/documents/upload`
- **内容编码**：`multipart/form-data`
- **请求表单参数**：
  - `file` (二进制文件流)：目标文件实体。
  - `parentId` (UUID)：可选。父文档 ID。
  - `title` (字符串)：文件文档的显示标题。
  - `summary` (字符串)：描述。
- **业务逻辑**：后端生成 `doc_type = file` 的文档记录，并将 `source_storage_key` 设置为文件在本地存储或对象存储的引用键。

#### 4.4.3 获取单个文档的元数据
- **方法与路径**：`GET /api/v1/documents/:documentId`
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "doc-child-uuid-v4",
      "workspaceId": "workspace-uuid-v4",
      "parentId": "doc-parent-uuid-v4",
      "title": "实验数据集规范描述",
      "summary": "包含所有科研数据格式规范描述",
      "ownerUserId": "user-uuid-v4",
      "docType": "rich_text",
      "status": "active",
      "sortOrder": 1000,
      "permissionBit": 7,
      "hasChildren": false,
      "favorited": false,
      "createdAt": "2026-05-20T16:00:00Z",
      "updatedAt": "2026-05-20T16:00:00Z"
    }
  }
  ```
  *(注：该接口仅返回文档的基本属性、当前用户最终权限掩码位图 `permissionBit` 及当前用户是否收藏 `favorited`，不携带正文 `body` 以保证网络轻量。成功读取该接口会记录当前用户的最近打开时间。)*

#### 4.4.4 修改文档基本信息
- **方法与路径**：`PATCH /api/v1/documents/:documentId`
- **请求体 (Payload)**：支持修改 `title`，`summary` 及 `sourceStorageKey`。

#### 4.4.5 移动文档节点
- **方法与路径**：`POST /api/v1/documents/:documentId/move`
- **请求体 (Payload)**：
  ```json
  {
    "parentId": "target-parent-uuid-v4",
    "sortOrder": 2000
  }
  ```
- **权限要求**：当前文档的 `MANAGE` 权限位。
- **安全约束**：禁止跨 workspace 移动，后端自动检测并阻断“向自己以及自己所有的子树分支下移动”的操作。

#### 4.4.6 归档、恢复与删除
- `POST /api/v1/documents/:documentId/archive`：归档（更改状态为 `archived`）。
- `POST /api/v1/documents/:documentId/restore`：从归档状态中唤醒恢复（重置为 `active`）。
- `DELETE /api/v1/documents/:documentId`：删除操作（标记 `deleted` 状态）。
- **权限要求**：这三者均要求具备当前文档的 `MANAGE` 权限位。

#### 4.4.7 获取文件型文档的存储引用
- **方法与路径**：`GET /api/v1/documents/:documentId/download`
- **用途**：仅用于 `docType = file` 的文档下载场景，返回存储系统密钥键。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "sourceStorageKey": "dataset-v2-final.xlsx"
    }
  }
  ```

#### 4.4.8 获取首页文档列表
- **方法与路径**：`GET /api/v1/documents/home`
- **用途**：为首页提供当前用户相关的文档列表。当前支持“我创建的”、“最近打开”、“我收藏的”三类。
- **查询参数 (Query)**：
  - `scope`（必填）：列表范围。
    - `mine`：我创建的文档，按 `createdAt` 倒序。
    - `recent`：最近打开的文档，按 `openedAt` 倒序。最近打开记录由 `GET /api/v1/documents/:documentId` 成功读取时写入。
    - `favorite`：我收藏的文档，按 `favoritedAt` 倒序。
  - `limit`（可选）：返回数量，默认 `20`，最大 `50`。
- **权限要求**：登录用户。列表只返回当前用户仍具备 `READ` 权限、且未被删除的文档。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "items": [
        {
          "id": "doc-uuid-v4",
          "workspaceId": "workspace-uuid-v4",
          "parentId": null,
          "title": "实验记录",
          "summary": "阶段性实验数据记录",
          "ownerUserId": "user-uuid-v4",
          "docType": "rich_text",
          "status": "active",
          "sortOrder": 1000,
          "permissionBit": 7,
          "hasChildren": false,
          "favorited": true,
          "openedAt": "2026-05-20T16:30:00Z",
          "favoritedAt": "2026-05-20T16:20:00Z",
          "createdAt": "2026-05-20T16:00:00Z",
          "updatedAt": "2026-05-20T16:10:00Z"
        }
      ]
    }
  }
  ```
  *(注：`openedAt` 仅在 `scope=recent` 时返回；`favoritedAt` 仅在 `scope=favorite` 时返回。)*

#### 4.4.9 收藏与取消收藏文档
- **收藏方法与路径**：`POST /api/v1/documents/:documentId/favorite`
- **取消收藏方法与路径**：`DELETE /api/v1/documents/:documentId/favorite`
- **权限要求**：当前用户至少具备该文档的 `READ` 权限。
- **业务逻辑**：
  - 收藏操作以当前用户和文档 ID 为唯一键，重复收藏保持幂等。
  - 取消收藏仅删除当前用户与该文档的收藏关系，不影响文档本身和其他用户收藏状态。
- **收藏响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "doc-uuid-v4",
      "title": "实验记录",
      "permissionBit": 7,
      "favorited": true
    }
  }
  ```
- **取消收藏响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "message": "取消收藏成功"
    }
  }
  ```

---

### 4.5 细粒度权限控制模块 (DocACL)

#### 4.5.1 获取文档上全部显式设置的 ACL 规则
- **方法与路径**：`GET /api/v1/documents/:documentId/acl`
- **权限要求**：当前文档的 `MANAGE` 权限位。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "items": [
        {
          "id": "acl-rule-uuid",
          "workspaceId": "workspace-uuid",
          "documentId": "document-uuid",
          "subjectType": "user",
          "subjectId": "external-user-uuid",
          "permissionBit": 3,
          "inherit": true,
          "createdBy": "owner-user-uuid",
          "createdAt": "2026-05-20T16:00:00Z",
          "updatedAt": "2026-05-20T16:00:00Z"
        }
      ]
    }
  }
  ```

#### 4.5.2 给文档新增权限授权 (或配置 public 公开分享)
- **方法与路径**：`POST /api/v1/documents/:documentId/acl`
- **请求体示例一（单独分享给特定科研协作人员）**：
  ```json
  {
    "subjectType": "user",
    "subjectId": "collaborator-user-uuid",
    "permissionBit": 3,
    "inherit": true
  }
  ```
- **请求体示例二（开启公共范围内的公开只读分享）**：
  ```json
  {
    "subjectType": "public",
    "subjectId": null,
    "permissionBit": 1,
    "inherit": true
  }
  ```
- **权限要求**：对当前文档具备 `MANAGE` 权限。

#### 4.5.3 更新及删除特定 ACL 规则
- `PATCH /api/v1/documents/:documentId/acl/:aclId`：更新已有规则的掩码位图或继承配置。
- `DELETE /api/v1/documents/:documentId/acl/:aclId`：物理移除该 ACL 授权项。

#### 4.5.4 预检当前用户对文档的最终实际算得权限
- **方法与路径**：`GET /api/v1/documents/:documentId/my-permission`
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "documentId": "document-uuid",
      "permissionBit": 7,
      "canRead": true,
      "canEdit": true,
      "canManage": true
    }
  }
  ```
  *(注：该接口由后端引擎根据前述的“权限判定优先级算法”实时进行位图合并计算并吐出，作为前端控制“编辑/只读/管理按钮状态”的预检入口。)*

---

### 4.6 文档正文 Blob 读写模块

该模块负责传输大体量二进制文档数据包。响应与请求完全脱离了统一响应 JSON 框架，采用标准 stream 流。

#### 4.6.1 读取文档正文二进制 (HTTP GET)
- **方法与路径**：`GET /api/v1/documents/:documentId/body`
- **权限要求**：文档 `READ` 权限。
- **响应头 (Headers)**：
  - `Content-Type: application/octet-stream`
- **响应正文**：
  - 文档序列化后的全量 Yjs 二进制状态快照，如果全新空文档，返回数据流长度为 `0`。

#### 4.6.2 回写/替换文档正文二进制 (HTTP PUT，支持 Yjs 刷盘与常规附件覆盖上传)
- **方法与路径**：`PUT /api/v1/documents/:documentId/body`
- **权限要求**：文档 `EDIT` 权限。
- **请求头 (Headers)**：
  - `Content-Type: application/octet-stream`
  - `X-Body-Type`（必填/可选）：标识内容正文的物理格式：
    - 富文本文档：固定为 `yjs_state`（不传默认为 `yjs_state`）。
    - 文件附件型文档：可选 `pdf`、`word`、`video` 等（禁止传入 `yjs_state`，否则报错）。
- **请求正文**：
  - 富文本文档：Node 协同服务生成的全量 `Y.encodeStateAsUpdate(ydoc)` 二进制字节流。
  - 文件型文档：需要覆盖保存的本地文件（如 Excel、Docx、PDF）的原始二进制字节流 (Raw Binary Data)。
- **响应体 (Data)**：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "size": 40960 // 返回保存后的文件字节大小 (bytes)
    }
  }
  ```

---

## 5. WebSocket 实时协同编辑协议 (Node.js)

协同服务在主 HTTP Server 外，独立通过 WebSocket 传输 Yjs CRDT 协议帧。

### 5.1 通信端点
```
ws://<host>:3001/documents/{documentId}
```

### 5.2 协议层增量包定义
消息均为 **二进制帧**，头部首字节用于区分逻辑协议：

| 首字节 (Byte 0) | 消息类型 | 传输方向 | 作用与含义 |
|---|---|---|---|
| `0x00` | **SyncStep1** | 客户端 ──> 服务端 | 握手包。携带客户端本地 YDoc 状态向量，向服务端发起同步。 |
| `0x01` | **SyncStep2** | 服务端 ──> 客户端 | 握手响应。根据客户端状态向量计算差异，只下发其缺失的增量 updates。 |
| `0x02` | **SyncUpdate** | 双向广播 | 增量编辑包。客户端输入/删除动作实时产生的二进制增量变动，向全网扩散。 |
| 自定义 | **Awareness** | 双向广播 | 用户感知包。传递当前协作者名字、光标偏移量及选择区域标记。 |

---

## 6. 后端演进待办与已知缺失设计

为配合系统逻辑的完整性，后端需在后续计划中新增以下非特权接口：
1. **全局用户模糊搜索接口**（普通保护路由）：
   - `GET /api/v1/users/search?q=keyword`
   - 参数：`q`（匹配 username / display_name / email）
   - 响应：返回模糊搜索命中的脱敏用户列表（ID, displayName, avatar, email），以支持前端分享模块的自动联想输入。
