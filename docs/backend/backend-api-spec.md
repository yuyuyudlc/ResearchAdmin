# 科研项目文档管理系统后端 API 草案

## 1. 文档目标

本文档定义后端 API 的初步分组、接口职责、权限要求和基础响应约定，用于前后端联调前的接口边界确认。

当前为第一版草案，字段细节和错误码会在后续联调阶段继续收敛。

## 2. 基础约定

### 2.1 路径前缀

统一前缀建议为：

```text
/api/v1
```

### 2.2 认证方式

- 业务接口默认使用 `JWT Bearer Token`
- 协同编辑链路使用后端签发的短时票据或专用 token

### 2.3 统一响应格式

建议统一返回结构：

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
  "code": 40001,
  "message": "invalid request",
  "data": null
}
```

### 2.4 认证与权限约定

本草案将“是否登录”与“文档 ACL 权限级别”分开描述。

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

- 先合并个人与群组权限（按位或）。
- 若命中 `DENY` 位则直接拒绝（`403`）。
- 若最终权限为 `0`，视为隐式不可见。

补充约定：

- `owner`：文档拥有者，天然视为 `7`（`READ | EDIT | MANAGE`）。
- `admin`：系统管理员权限（系统级），不等同于文档 `owner`。

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
      "id": 1,
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

### 3.2 获取当前用户信息

- 方法：`GET`
- 路径：`/api/v1/auth/me`
- 权限：`login`

### 3.3 注册账号

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

### 3.4 修改密码

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

### 3.5 修改个人信息

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

### 3.6 退出登录

- 方法：`POST`
- 路径：`/api/v1/auth/logout`
- 权限：`login`

说明：

- 如果只使用无状态 JWT，该接口可仅用于前端语义化退出和刷新服务端审计记录。

## 4. 用户与用户组接口

### 4.1 获取用户列表

- 方法：`GET`
- 路径：`/api/v1/users`
- 权限：`admin`

用途：

- 共享弹窗搜索可授权用户
- 管理端用户管理

### 4.2 获取用户组列表

- 方法：`GET`
- 路径：`/api/v1/groups`
- 权限：`login`

### 4.3 创建用户组

- 方法：`POST`
- 路径：`/api/v1/groups`
- 权限：`admin`

### 4.4 更新用户组成员

- 方法：`PUT`
- 路径：`/api/v1/groups/:groupId/members`
- 权限：`admin`

请求体示例：

```json
{
  "userIds": [1, 2, 3]
}
```

## 5. 项目接口

### 5.1 获取项目列表

- 方法：`GET`
- 路径：`/api/v1/projects`
- 权限：`login`

### 5.2 创建项目

- 方法：`POST`
- 路径：`/api/v1/projects`
- 权限：`admin`

### 5.3 获取项目详情

- 方法：`GET`
- 路径：`/api/v1/projects/:projectId`
- 权限：`login`

## 6. 文档接口

### 6.1 上传文件型文档

- 方法：`POST`
- 路径：`/api/v1/documents/upload`
- 权限：`login`
- 内容类型：`multipart/form-data`

表单字段建议：

- `file`
- `title`
- `projectId`
- `summary`
- `stage`
- `principalName`
- `tags`

处理要求：

- 保存文件
- 创建文档元数据
- 建立拥有者关系
- 生成初始历史记录
- 写入审计日志

### 6.2 创建富文本文档

- 方法：`POST`
- 路径：`/api/v1/documents`
- 权限：`login`

请求体示例：

```json
{
  "title": "实验记录草稿",
  "projectId": 10,
  "summary": "记录 4 月实验过程",
  "stage": "实验阶段",
  "principalName": "张三",
  "tags": ["实验", "阶段一"],
  "docType": "rich_text"
}
```

### 6.3 获取文档列表

- 方法：`GET`
- 路径：`/api/v1/documents`
- 权限：`login`

查询参数建议：

- `keyword`
- `projectId`
- `stage`
- `tag`
- `ownerUserId`
- `status`
- `updatedFrom`
- `updatedTo`
- `page`
- `pageSize`

说明：

- 返回结果必须经过权限过滤。

### 6.4 获取文档详情

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId`
- 权限：`read`

返回内容建议：

- 文档基础信息
- 当前权限摘要
- 当前版本信息
- 标签
- 拥有者信息

### 6.5 更新文档元数据

- 方法：`PATCH`
- 路径：`/api/v1/documents/:documentId`
- 权限：`edit`

可更新字段建议：

- `title`
- `summary`
- `projectId`
- `stage`
- `principalName`
- `tags`

### 6.6 归档文档

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/archive`
- 权限：`edit`

### 6.7 取消归档

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/unarchive`
- 权限：`edit`

### 6.8 下载文档

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/download`
- 权限：`read`

补充说明：

- 实际下载前应校验 `download` 能力。
- 下载动作必须写审计日志。

### 6.9 获取预览地址

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/preview`
- 权限：`read`

## 7. 历史版本接口

### 7.1 获取历史版本列表

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/versions`
- 权限：`read`

返回字段建议：

- `id`
- `versionNo`
- `snapshotType`
- `summary`
- `operator`
- `createdAt`

### 7.2 获取指定历史快照详情

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/versions/:versionId`
- 权限：`read`

### 7.3 恢复历史版本

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/versions/:versionId/restore`
- 权限：`edit`

请求体示例：

```json
{
  "reason": "回滚误修改内容"
}
```

处理要求：

- 恢复当前文档状态
- 生成新的历史记录
- 写入审计日志

## 8. 共享与权限接口

### 8.1 获取共享配置

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/permissions`
- 权限：`MANAGE` 位

返回内容建议：

- 当前拥有者
- 用户授权列表
- 用户组授权列表
- 当前用户最终权限

### 8.2 批量更新单用户授权

- 方法：`PUT`
- 路径：`/api/v1/documents/:documentId/permissions/users`
- 权限：`MANAGE` 位

请求体示例：

```json
{
  "items": [
    {
      "userId": 2,
      "permissionBit": 7
    },
    {
      "userId": 3,
      "permissionBit": 1
    }
  ]
}
```

### 8.3 批量更新用户组授权

- 方法：`PUT`
- 路径：`/api/v1/documents/:documentId/permissions/groups`
- 权限：`MANAGE` 位

### 8.4 转移文档拥有者

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/transfer-owner`
- 权限：`MANAGE` 位

请求体示例：

```json
{
  "targetUserId": 10,
  "reason": "项目负责人调整"
}
```

说明：

- 只有 `owner` 或系统管理员可执行。
- 转移拥有者必须写审计日志。

### 8.5 获取当前用户对文档的最终权限

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/my-permission`
- 权限：`login`

用途：

- 前端详情页快速判断按钮态
- 协同编辑页进入前预检

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "documentId": 1001,
    "userPerm": 3
  }
}
```

## 9. 协同编辑接口

### 9.1 获取协同会话票据

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/collab/token`
- 权限：`edit`

响应体示例：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "short-lived-token",
    "expiresIn": 300
  }
}
```

### 9.2 获取在线协作者

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/collab/presence`
- 权限：`read`

### 9.3 正式保存协同内容

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/collab/save`
- 权限：`edit`

请求体示例：

```json
{
  "summary": "补充实验结论部分"
}
```

处理要求：

- 从协同状态生成正式快照
- 更新当前版本
- 写入历史记录和审计日志

## 10. 评论接口

### 10.1 获取评论列表

- 方法：`GET`
- 路径：`/api/v1/documents/:documentId/comments`
- 权限：`read`

查询参数建议：

- `versionId`
- `status`

### 10.2 新增评论

- 方法：`POST`
- 路径：`/api/v1/documents/:documentId/comments`
- 权限：`READ` 位（若业务要求评论与编辑绑定，可改为 `EDIT` 位）

请求体示例：

```json
{
  "content": "这里的实验条件需要补充说明",
  "versionId": 23,
  "anchorData": {
    "from": 120,
    "to": 150
  }
}
```

### 10.3 回复评论

- 方法：`POST`
- 路径：`/api/v1/comments/:commentId/replies`
- 权限：`READ` 位（若业务要求评论与编辑绑定，可改为 `EDIT` 位）

### 10.4 更新评论状态

- 方法：`PATCH`
- 路径：`/api/v1/comments/:commentId/status`
- 权限：`READ` 位（若业务要求评论与编辑绑定，可改为 `EDIT` 位）

请求体示例：

```json
{
  "status": "resolved"
}
```

## 11. 检索接口

### 11.1 文档搜索

- 方法：`GET`
- 路径：`/api/v1/search/documents`
- 权限：`login`

查询参数建议：

- `q`
- `projectId`
- `tag`
- `stage`
- `fileType`
- `ownerUserId`
- `permissionLevel`
- `updatedFrom`
- `updatedTo`
- `page`
- `pageSize`

说明：

- 元数据搜索和全文搜索可以先共用一个入口，内部按能力拆分实现。
- 搜索结果必须在返回前完成权限过滤。

## 12. 审计日志接口

### 12.1 查询审计日志

- 方法：`GET`
- 路径：`/api/v1/audit-logs`
- 权限：`admin`

查询参数建议：

- `eventType`
- `operatorUserId`
- `targetType`
- `targetId`
- `dateFrom`
- `dateTo`
- `page`
- `pageSize`

## 13. 备份恢复接口

### 13.1 获取备份任务列表

- 方法：`GET`
- 路径：`/api/v1/backup/jobs`
- 权限：`admin`

### 13.2 发起备份任务

- 方法：`POST`
- 路径：`/api/v1/backup/jobs`
- 权限：`admin`

### 13.3 发起恢复任务

- 方法：`POST`
- 路径：`/api/v1/backup/restore`
- 权限：`admin`

## 14. 错误码建议

第一版可先按大类约定：

- `0`：成功
- `400xx`：请求参数错误
- `401xx`：未登录或 token 无效
- `403xx`：无权限
- `404xx`：资源不存在
- `409xx`：状态冲突或业务冲突
- `500xx`：服务内部错误

示例：

- `40001`：请求参数不合法
- `40101`：未登录
- `40102`：token 已过期
- `40301`：无查看权限
- `40302`：无编辑权限
- `40303`：无管理权限
- `40401`：文档不存在
- `40901`：文档已归档

## 15. 第一阶段建议优先实现的接口

如果当前要先落 MVP，建议优先做以下接口：

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/documents/upload`
- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/:documentId`
- `PATCH /api/v1/documents/:documentId`
- `GET /api/v1/documents/:documentId/versions`
- `GET /api/v1/documents/:documentId/permissions`
- `PUT /api/v1/documents/:documentId/permissions/users`
- `PUT /api/v1/documents/:documentId/permissions/groups`
- `GET /api/v1/documents/:documentId/comments`
- `POST /api/v1/documents/:documentId/comments`

这样可以先打通：

```text
登录
-> 创建 / 上传文档
-> 查看列表和详情
-> 分配共享权限
-> 查看历史
-> 评论协作
```
