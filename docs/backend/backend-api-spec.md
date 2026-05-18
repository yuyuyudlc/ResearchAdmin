# 科研项目文档管理系统后端 API

## 1. 文档目标

本文档定义当前后端已实现 API 的分组、接口职责、权限要求和基础响应约定，用于前后端联调。

本文档只记录当前 Go 后端路由真实暴露的接口；尚未实现的评论、检索、审计、备份等接口不在本文档中描述。

## 2. 基础约定

### 2.1 路径前缀

统一前缀建议为：

```text
/api/v1
```

### 2.2 认证方式

- `/api/v1/auth/login` 和 `/api/v1/auth/register` 无需登录。
- 其他 `/api/v1` 业务接口默认使用 `JWT Bearer Token`。
- Swagger 文档路由 `/swagger/*any` 无需登录。

### 2.3 统一响应格式

除明确说明返回二进制的接口外，后端统一返回结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

错误响应示例：

```json
{
  "code": 400,
  "message": "invalid request",
  "data": null
}
```

说明：

- 成功响应的 `code` 固定为 `0`。
- 错误响应的 `code` 当前使用 HTTP 状态码，例如 `400`、`401`、`403`、`404`、`409`、`500`。

### 2.4 ID 约定

- 全站业务主键统一使用 UUID 字符串。
- 请求和响应中的 `userId`、`workspaceId`、`documentId`、`aclId` 等 ID 字段都按字符串处理。
- 前端不要把 ID 转成 number。

### 2.5 认证与权限约定

本文档将“是否登录”与“文档 ACL 权限级别”分开描述。

认证要求：

- `public`：无需登录
- `login`：需要登录

文档 ACL 使用整型位掩码（`permissionBit`）表示，建议常量：

- `READ = 1 << 0`（`1`）
- `EDIT = 1 << 1`（`2`）
- `MANAGE = 1 << 2`（`4`）
- `DENY = 1 << 3`（`8`）

常见权限值：

- 可读：`1`
- 可编辑：`3`（`READ | EDIT`）
- 管理者：`7`（`READ | EDIT | MANAGE`）
- 显式不可见：`8`（`DENY`）

决议规则：

- 文档拥有者天然视为 `7`（`READ | EDIT | MANAGE`），不受 `DENY` 影响。
- `workspace` 的 `owner` 天然视为 `7`（`READ | EDIT | MANAGE`），不受 `DENY` 影响。
- `workspace` 的 `member` 默认视为 `3`（`READ | EDIT`）。
- `doc_acl` 只保存文档级例外规则，不保存 `workspace` 默认权限。
- 对普通成员、外部用户和 public 访问者，若命中 `DENY` 位则最终权限为 `0`。
- 若最终权限为 `0`，视为隐式不可见。

补充约定：

- `workspace owner`：空间管理者，来自 `workspace_members.role = owner`。
- `workspace member`：空间普通成员，来自 `workspace_members.role = member`。
- `document owner`：文档创建者 / 拥有者，来自 `documents.owner_user_id`。
- `admin`：系统管理员权限（系统级），不等同于 `workspace owner` 或 `document owner`。

## 3. 认证接口

### 3.1 登录

- 方法：`POST`
- 路径：`/api/v1/auth/login`
- 权限：`public`

请求体示例：

```json
{
  "email": "alice@example.com",
  "password": "123456"
}
```

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "jwt-token",
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

### 3.2 注册账号

- 方法：`POST`
- 路径：`/api/v1/auth/register`
- 权限：`public`

请求体示例：

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

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "注册成功"
  }
}
```

### 3.3 修改密码

- 方法：`PUT`
- 路径：`/api/v1/auth/password`
- 权限：`login`

请求体示例：

```json
{
  "old_password": "123456",
  "new_password": "new123456"
}
```

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "密码修改成功"
  }
}
```

### 3.4 修改个人信息

- 方法：`PUT`
- 路径：`/api/v1/auth/profile`
- 权限：`login`

请求体示例：

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

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "个人信息修改成功"
  }
}
```

## 4. Workspace 接口

### 4.1 创建 Workspace

- 方法：`POST`
- 路径：`/api/v1/workspaces`
- 权限：`login`

请求体示例：

```json
{
  "name": "研发空间",
  "description": "项目资料"
}
```

处理要求：

- 创建 `workspaces` 记录。
- 创建 `workspace_members` 记录，当前用户角色为 `owner`。
- 返回 workspace 基础信息。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "workspace-1",
    "name": "研发空间",
    "description": "项目资料",
    "ownerUserId": "user-1",
    "status": "active",
    "createdAt": "2026-04-27T10:00:00Z",
    "updatedAt": "2026-04-27T10:00:00Z"
  }
}
```

### 4.2 获取 Workspace 列表

- 方法：`GET`
- 路径：`/api/v1/workspaces`
- 权限：`login`

用途：

- 获取当前用户加入的 workspace 列表。
- 不返回文档树。

处理要求：

- 查询当前用户所在的 `workspace_members`。
- 返回对应 workspace 和当前用户在每个 workspace 中的角色。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "workspace-1",
        "name": "研发空间",
        "description": "项目资料",
        "ownerUserId": "user-1",
        "role": "owner",
        "status": "active",
        "createdAt": "2026-04-27T10:00:00Z",
        "updatedAt": "2026-04-27T10:00:00Z"
      }
    ]
  }
}
```

### 4.3 获取 Workspace 目录子节点

- 方法：`GET`
- 路径：`/api/v1/workspaces/:workspaceId`
- 权限：`login` 或可通过 `doc_acl` 访问的外部用户

用途：

- 进入 workspace 时获取根级目录。
- 展开某个父文档时，懒加载该父文档的直接子节点。
- 该接口只返回一层子节点，不返回整棵树。

查询参数：

- `parentId`：父文档 ID。为空或不传时表示获取根级文档。
- `status`：文档状态，默认 `active`。
- `limit`：返回数量，默认由后端配置。
- `cursor`：分页游标，可选。

请求示例：

```http
GET /api/v1/workspaces/workspace-1?parentId=doc-a
```

获取根级节点：

```http
GET /api/v1/workspaces/workspace-1
```

处理要求：

- 查询 workspace 基础信息。
- 校验当前用户对 workspace 或目标父文档有访问资格。
- 当 `parentId` 为空时，查询 `parent_id IS NULL` 的根级文档。
- 当 `parentId` 不为空时，校验父文档存在且属于当前 workspace。
- 查询目标 parent 的直接子文档。
- 对返回节点逐个做 `READ` 权限过滤。
- 按 `sort_order ASC, created_at ASC` 排序。
- 返回 workspace 信息、当前用户角色、父节点信息和子节点列表。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "workspace": {
      "id": "workspace-1",
      "name": "研发空间",
      "description": "项目资料",
      "ownerUserId": "user-1",
      "status": "active"
    },
    "currentMember": {
      "userId": "user-1",
      "role": "owner"
    },
    "parent": {
      "id": "doc-a",
      "title": "产品文档",
      "permissionBit": 7
    },
    "items": [
      {
        "id": "doc-b",
        "workspaceId": "workspace-1",
        "parentId": "doc-a",
        "title": "需求说明",
        "summary": "",
        "ownerUserId": "user-1",
        "docType": "rich_text",
        "status": "active",
        "sortOrder": 1000,
        "permissionBit": 7,
        "hasChildren": false,
        "createdAt": "2026-04-27T10:00:00Z",
        "updatedAt": "2026-04-27T10:00:00Z"
      }
    ],
    "nextCursor": null
  }
}
```

说明：

- `parent = null` 表示当前返回的是 workspace 根级目录。
- `hasChildren` 用于前端决定是否展示展开入口。
- `updatedAt` 是文档元数据更新时间，不代表正文最近编辑时间。

### 4.4 更新 Workspace 元数据

- 方法：`PATCH`
- 路径：`/api/v1/workspaces/:workspaceId`
- 权限：`workspace owner`

可更新字段：

- `name`
- `description`
- `status`

### 4.5 删除 Workspace

- 方法：`DELETE`
- 路径：`/api/v1/workspaces/:workspaceId`
- 权限：`workspace owner`

处理要求：

- 建议软删除，更新 `workspaces.status = deleted`。
- 被删除 workspace 不再出现在 workspace 列表中。

## 5. Workspace Member 接口

### 5.1 获取 Workspace 成员列表

- 方法：`GET`
- 路径：`/api/v1/workspaces/:workspaceId/members`
- 权限：`workspace member` 或 `workspace owner`

用途：

- 查看 workspace 当前成员和角色。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "userId": "user-1",
        "role": "owner",
        "joinedAt": "2026-04-27T10:00:00Z"
      },
      {
        "userId": "user-2",
        "role": "member",
        "joinedAt": "2026-04-27T10:10:00Z"
      }
    ]
  }
}
```

### 5.2 添加 Workspace 成员

- 方法：`POST`
- 路径：`/api/v1/workspaces/:workspaceId/members`
- 权限：`workspace owner`

请求体示例：

```json
{
  "userId": "user-2",
  "role": "member"
}
```

处理要求：

- `role` 只允许 `owner` 或 `member`。
- 校验目标用户存在。
- 已存在成员时可返回 `409`，也可按幂等语义返回已有记录。

### 5.3 修改 Workspace 成员角色

- 方法：`PATCH`
- 路径：`/api/v1/workspaces/:workspaceId/members/:userId`
- 权限：`workspace owner`

请求体示例：

```json
{
  "role": "owner"
}
```

处理要求：

- `role` 只允许 `owner` 或 `member`。
- 不允许把 workspace 修改到没有任何 owner 的状态。

### 5.4 移除 Workspace 成员

- 方法：`DELETE`
- 路径：`/api/v1/workspaces/:workspaceId/members/:userId`
- 权限：`workspace owner`

处理要求：

- 不允许删除 workspace 最后一个 owner。

## 6. Document 接口

### 6.1 创建文档

- 方法：`POST`
- 路径：`/api/v1/workspaces/:workspaceId/documents`
- 权限：根文档需要 `workspace member` 或 `workspace owner`；子文档需要对父文档有 `EDIT` 位

请求体示例：

```json
{
  "parentId": null,
  "title": "需求文档",
  "summary": "",
  "docType": "rich_text"
}
```

处理要求：

- 校验 workspace 存在且未删除。
- 如果 `parentId` 为空，创建根文档。
- 如果 `parentId` 不为空，校验父文档存在且属于当前 workspace。
- `owner_user_id` 设置为当前用户。
- `sort_order` 设置为同级最大 `sort_order + 1000`。
- `status` 默认为 `active`。
- `source_storage_key` 由后端生成或由后续正文/文件服务补充。

### 6.2 上传文件型文档

- 方法：`POST`
- 路径：`/api/v1/workspaces/:workspaceId/documents/upload`
- 权限：根文档需要 `workspace member` 或 `workspace owner`；子文档需要对父文档有 `EDIT` 位
- 内容类型：`multipart/form-data`

表单字段建议：

- `file`
- `parentId`
- `title`
- `summary`

处理要求：

- 读取上传文件内容。
- 创建 `doc_type = file` 的 document 元数据。
- `source_storage_key` 保存上传文件名。
- 将文件内容写入正文存储，正文类型根据文件扩展名推断。

### 6.3 获取文档详情

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId`
- 权限：`READ` 位

用途：

- 获取单个文档元数据。
- 不返回正文内容。

返回内容建议：

- 文档基础信息。
- 当前用户最终权限 `permissionBit`。
- 是否有子节点 `hasChildren`。
- 拥有者信息。

### 6.4 更新文档元数据

- 方法：`PATCH`
- 路径：`/api/v1/documents/:documentId`
- 权限：`EDIT` 位

可更新字段：

- `title`
- `summary`
- `sourceStorageKey`

说明：

- 这里只更新文档元数据，不更新正文内容。
- `documents.updated_at` 是元数据更新时间，不代表正文最近编辑时间。

### 6.5 移动文档

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/move`
- 权限：当前文档需要 `MANAGE` 位

请求体示例：

```json
{
  "parentId": "target-parent-id",
  "sortOrder": 2000
}
```

处理要求：

- 校验当前文档存在。
- 如果 `parentId` 不为空，校验目标父文档存在。
- 校验目标父文档和当前文档属于同一个 workspace。
- 不允许移动到自己下面。
- 不允许移动到自己的子孙文档下面。
- 更新 `parent_id` 和 `sort_order`。

### 6.6 归档文档

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/archive`
- 权限：`MANAGE` 位

处理要求：

- 更新 `documents.status = archived`。

### 6.7 恢复文档

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/restore`
- 权限：`MANAGE` 位

处理要求：

- 更新 `documents.status = active`。

### 6.8 删除文档

- 方法：`DELETE`
- 路径：`/api/v1/documents/:documentId`
- 权限：`MANAGE` 位

处理要求：

- 建议软删除，更新 `documents.status = deleted`。
- 子文档处理策略需要实现时明确：要么级联软删除，要么禁止删除有子文档的文档。

### 6.9 下载文件型文档

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/download`
- 权限：`READ` 位
- 响应类型：`application/json`

说明：

- 仅适用于 `doc_type = file` 的文档，否则返回请求错误。
- 当前接口返回文件型文档的存储引用，不直接返回文件二进制。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sourceStorageKey": "report.pdf"
  }
}
```

## 7. Doc ACL 接口

### 7.1 获取文档 ACL

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/acl`
- 权限：`MANAGE` 位

用途：

- 查看当前文档上显式配置的文档级例外规则。
- 不返回 workspace 默认权限。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "acl-1",
        "workspaceId": "workspace-1",
        "documentId": "doc-1",
        "subjectType": "public",
        "subjectId": null,
        "permissionBit": 1,
        "inherit": true,
        "createdBy": "user-1",
        "createdAt": "2026-04-27T10:00:00Z",
        "updatedAt": "2026-04-27T10:00:00Z"
      }
    ]
  }
}
```

### 7.2 新增文档 ACL

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/acl`
- 权限：`MANAGE` 位

请求体示例：

```json
{
  "subjectType": "user",
  "subjectId": "user-2",
  "permissionBit": 3,
  "inherit": true
}
```

public 分享示例：

```json
{
  "subjectType": "public",
  "subjectId": null,
  "permissionBit": 1,
  "inherit": true
}
```

处理要求：

- `subjectType` 只允许 `user` 或 `public`。
- `subjectType = user` 时，`subjectId` 必须为有效用户 ID。
- `subjectType = public` 时，`subjectId` 必须为空。
- `permissionBit` 允许 `READ`、`EDIT`、`MANAGE` 的组合，或单独 `DENY`。
- `doc_acl` 只存文档级例外规则。

### 7.3 更新文档 ACL

- 方法：`PATCH`
- 路径：`/api/v1/documents/:documentId/acl/:aclId`
- 权限：`MANAGE` 位

可更新字段：

- `permissionBit`
- `inherit`

### 7.4 删除文档 ACL

- 方法：`DELETE`
- 路径：`/api/v1/documents/:documentId/acl/:aclId`
- 权限：`MANAGE` 位

处理要求：

- 删除当前文档上的指定 ACL 规则。

### 7.5 获取当前用户对文档的最终权限

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/my-permission`
- 权限：`login`

用途：

- 前端详情页快速判断按钮态。
- 打开正文编辑页前预检。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "documentId": "doc-1",
    "permissionBit": 7,
    "canRead": true,
    "canEdit": true,
    "canManage": true
  }
}
```

## 8. 文档正文接口

当前后端已实现文档正文的二进制读写接口。正文数据存储在正文表中，`documents.updated_at` 仍只表示文档元数据更新时间。

### 8.1 获取文档正文

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/body`
- 权限：`READ` 位
- 响应类型：`application/octet-stream`

说明：

- 返回文档正文二进制数据。
- 该接口不使用统一 JSON 响应结构。

### 8.2 更新文档正文

- 方法：`PUT`
- 路径：`/api/v1/documents/:documentId/body`
- 权限：`EDIT` 位
- 请求类型：`application/octet-stream`
- 响应类型：`application/json`

请求头：

- `X-Body-Type`：可选。正文类型，例如 `yjs_state`、`pdf`、`word`、`video`。不传时默认按 `yjs_state` 处理。

请求体：

- 文档正文二进制数据。

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "size": 1024
  }
}
```

## 9. 错误码

当前错误响应的 `code` 与 HTTP 状态码一致：

- `0`：成功
- `400`：请求参数错误
- `401`：未登录或 token 无效
- `403`：无权限
- `404`：资源不存在
- `409`：状态冲突或业务冲突
- `500`：服务内部错误

错误响应示例：

```json
{
  "code": 403,
  "message": "无权限",
  "data": null
}
```

## 10. 当前后端已实现接口清单

认证接口：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `PUT /api/v1/auth/password`
- `PUT /api/v1/auth/profile`

Workspace 接口：

- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces`
- `GET /api/v1/workspaces/:workspaceId`
- `PATCH /api/v1/workspaces/:workspaceId`
- `DELETE /api/v1/workspaces/:workspaceId`
- `GET /api/v1/workspaces/:workspaceId/members`
- `POST /api/v1/workspaces/:workspaceId/members`
- `PATCH /api/v1/workspaces/:workspaceId/members/:userId`
- `DELETE /api/v1/workspaces/:workspaceId/members/:userId`

文档接口：

- `POST /api/v1/workspaces/:workspaceId/documents`
- `POST /api/v1/workspaces/:workspaceId/documents/upload`
- `GET /api/v1/documents/:documentId`
- `PATCH /api/v1/documents/:documentId`
- `POST /api/v1/documents/:documentId/move`
- `POST /api/v1/documents/:documentId/archive`
- `POST /api/v1/documents/:documentId/restore`
- `DELETE /api/v1/documents/:documentId`
- `GET /api/v1/documents/:documentId/download`

ACL 接口：

- `GET /api/v1/documents/:documentId/acl`
- `POST /api/v1/documents/:documentId/acl`
- `PATCH /api/v1/documents/:documentId/acl/:aclId`
- `DELETE /api/v1/documents/:documentId/acl/:aclId`
- `GET /api/v1/documents/:documentId/my-permission`

正文接口：

- `GET /api/v1/documents/:documentId/body`
- `PUT /api/v1/documents/:documentId/body`
