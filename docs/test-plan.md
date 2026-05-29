# 科研项目文档管理系统

# 测试计划与用例文档

---

**文档版本**：v1.0  
**编制日期**：2026-05-29  
**文档状态**：正式版  

---

## 目录

- [1. 测试概述](#1-测试概述)
  - [1.1 测试目标](#11-测试目标)
  - [1.2 测试范围](#12-测试范围)
  - [1.3 测试策略](#13-测试策略)
  - [1.4 测试环境](#14-测试环境)
- [2. 现有测试概况](#2-现有测试概况)
  - [2.1 后端单元测试](#21-后端单元测试)
  - [2.2 测试覆盖率缺口](#22-测试覆盖率缺口)
- [3. 后端单元测试用例](#3-后端单元测试用例)
  - [3.1 认证模块](#31-认证模块)
  - [3.2 工作区模块](#32-工作区模块)
  - [3.3 文档模块](#33-文档模块)
  - [3.4 ACL 权限模块](#34-acl-权限模块)
  - [3.5 表格数据模块](#35-表格数据模块)
  - [3.6 管理员模块](#36-管理员模块)
- [4. 前端测试用例](#4-前端测试用例)
  - [4.1 组件单元测试](#41-组件单元测试)
  - [4.2 Hook 测试](#42-hook-测试)
  - [4.3 服务层测试](#43-服务层测试)
- [5. 集成测试用例](#5-集成测试用例)
  - [5.1 API 接口集成测试](#51-api-接口集成测试)
  - [5.2 WebSocket 协同集成测试](#52-websocket-协同集成测试)
  - [5.3 前后端联调测试](#53-前后端联调测试)
- [6. 端到端测试场景](#6-端到端测试场景)
  - [6.1 管理员完整流程](#61-管理员完整流程)
  - [6.2 普通用户完整流程](#62-普通用户完整流程)
  - [6.3 多人协同编辑场景](#63-多人协同编辑场景)
- [7. 性能测试](#7-性能测试)
  - [7.1 API 性能测试](#71-api-性能测试)
  - [7.2 协同服务压力测试](#72-协同服务压力测试)
- [8. 安全测试](#8-安全测试)
  - [8.1 认证安全测试](#81-认证安全测试)
  - [8.2 ACL 权限安全测试](#82-acl-权限安全测试)
  - [8.3 常见攻击测试](#83-常见攻击测试)
- [9. 测试执行计划](#9-测试执行计划)
- [附录 A：冒烟测试脚本](#附录-a冒烟测试脚本)

---

## 1. 测试概述

### 1.1 测试目标

| 目标 | 描述 |
|------|------|
| **功能正确性** | 确保所有 10 个功能模块按照需求规格正确运行 |
| **接口契约** | 验证 50+ RESTful API 接口的请求/响应格式符合约定 |
| **安全性** | 验证 JWT 认证链路、ACL 权限判定算法、数据隔离等安全机制 |
| **协同一致性** | 验证 Yjs CRDT 引擎在多用户并发编辑场景下的数据一致性 |
| **边界鲁棒性** | 验证防死锁移动、最后 Owner 保护、并发冲突等边界场景 |

### 1.2 测试范围

| 测试层级 | 范围 | 状态 |
|----------|------|------|
| **后端单元测试** | Go 后端各 service、repository、handler | 部分已实现 |
| **后端集成测试** | 完整 HTTP 请求链路 (router → handler → service → DB) | 部分已实现 |
| **前端单元测试** | React 组件、Hooks、服务层 | ❌ 未实现 |
| **端到端测试** | 浏览器端完整用户操作流程 | ❌ 未实现 |
| **WebSocket 测试** | Node.js 协同服务功能 | ❌ 未实现 |
| **性能测试** | API 压力测试、协同服务并发测试 | ❌ 未实现 |
| **安全测试** | 渗透测试、权限绕过测试 | ❌ 未实现 |

### 1.3 测试策略

采用**测试金字塔**分层策略，由底向上：

```
          ┌───────────────┐
          │  E2E (少量)    │  手动 + Cypress/Playwright
          ├───────────────┤
          │ 集成测试 (中量) │  Go HTTP test + Supertest
          ├───────────────┤
          │ 单元测试 (大量) │  Go testing + Jest/Vitest
          └───────────────┘
```

- **每次提交**：运行全部单元测试 + 集成测试（目标 < 30s）
- **每日构建**：运行全部测试 + E2E 冒烟测试
- **发版前**：运行全量 E2E 测试 + 性能回归测试

### 1.4 测试环境

| 组件 | 测试环境 | 说明 |
|------|----------|------|
| 数据库 | SQLite 内存数据库 (`file::memory:?cache=shared`) | 每次测试独立实例，保证隔离性 |
| Go 后端 | `go test` 内置测试框架 | 无需启动独立 HTTP 服务器 |
| Node 协同 | 待搭建 | 需独立进程 + 模拟 WebSocket 客户端 |
| 前端 | 待搭建 (Jest/Vitest + jsdom) | 需安装测试依赖 |
| E2E 浏览器 | 待搭建 (Playwright/Cypress) | 需启动全部服务 |

---

## 2. 现有测试概况

### 2.1 后端单元测试

项目已有 **4 个 Go 测试文件，25 个测试用例**，覆盖主要业务逻辑：

| 文件 | 测试数 | 覆盖模块 |
|------|--------|----------|
| `backend/internal/database/database_test.go` | 1 | 数据库初始化与自动迁移 |
| `backend/internal/service/document_service_test.go` | 2 | 权限解析、最后Owner保护 |
| `backend/internal/service/document_spreadsheet_service_test.go` | 1 | 表格块生命周期 |
| `backend/internal/service/integration_test.go` | 21 | 完整集成测试：认证、工作区、文档CRUD、ACL、目录树、首页列表、用户搜索、完整用户旅程 |

### 2.2 测试覆盖率缺口

| 缺口 | 影响 | 优先级 |
|------|------|--------|
| **前端无任何测试** | 前端逻辑（组件渲染、Hook、API调用）无保障 | P1 |
| **WebSocket 协同无测试** | CRDT 数据一致性无自动化验证 | P1 |
| **文件上传/下载无测试** | `multipart/form-data` 链路未覆盖 | P2 |
| **管理员模块无独立测试** | admin handler 未直接测试 | P2 |
| **并发/竞态无测试** | 多用户同时操作同一文档的场景未覆盖 | P2 |
| **Node 协同服务无测试** | Node.js 服务逻辑（YDoc pool、flush 调度）未测试 | P1 |

---

## 3. 后端单元测试用例

### 3.1 认证模块

#### 3.1.1 AuthService 测试

| 用例编号 | 用例名称 | 前置条件 | 输入 | 预期输出 | 状态 |
|----------|----------|----------|------|----------|------|
| AUTH-UT-001 | 正常注册 | 数据库中无相同邮箱 | 有效注册信息 | 返回成功，生成用户记录，密码已哈希 | ✅ 已实现 |
| AUTH-UT-002 | 重复邮箱注册 | 数据库中已存在 `test@example.com` | 使用同一邮箱再次注册 | 返回 409 错误 | ✅ 已实现 |
| AUTH-UT-003 | 正确密码登录 | 已创建用户 | 正确邮箱+密码 | 返回 JWT Token + 用户 Profile | ✅ 已实现 |
| AUTH-UT-004 | 错误密码登录 | 已创建用户 | 正确邮箱+错误密码 | 返回 401 错误 | ✅ 已实现 |
| AUTH-UT-005 | Token 过期验证 | 系统时间 > Token 过期时间 | 过期 Token | 返回 401 错误 | ❌ 待实现 |
| AUTH-UT-006 | 修改密码 | 已登录用户 | 旧密码+新密码 | 旧密码失效，新密码可登录 | ✅ 已实现 |
| AUTH-UT-007 | 修改个人信息 | 已登录用户 | 新 username + email | 返回更新后 Profile，新邮箱可登录 | ✅ 已实现 |
| AUTH-UT-008 | 空字段注册 | — | username/email/password 为空 | 返回 400 验证错误 | ❌ 待实现 |
| AUTH-UT-009 | 无效邮箱格式 | — | email = "not-an-email" | 返回 400 验证错误 | ❌ 待实现 |
| AUTH-UT-010 | 密码过短 | — | password = "123" (< 6位) | 返回 400 验证错误 | ❌ 待实现 |

#### 3.1.2 用户搜索测试

| 用例编号 | 用例名称 | 输入 | 预期输出 | 状态 |
|----------|----------|------|----------|------|
| SRCH-UT-001 | 用户名模糊搜索 | `q=ali` | 匹配 username/display_name 包含 "ali" 的用户 | ✅ 已实现 |
| SRCH-UT-002 | 邮箱搜索 | `q=test@` | 匹配 email 包含 "test@" 的用户 | ✅ 已实现 |
| SRCH-UT-003 | 空关键字 | `q=` | 返回空列表 | ✅ 已实现 |
| SRCH-UT-004 | 已禁用用户排除 | 搜索时存在 disabled 用户 | 返回列表不包含 disabled 用户 | ✅ 已实现 |
| SRCH-UT-005 | 多用户匹配 | 关键字匹配多个用户 | 返回全部匹配用户 | ✅ 已实现 |

### 3.2 工作区模块

| 用例编号 | 用例名称 | 前置条件 | 输入 | 预期输出 | 状态 |
|----------|----------|----------|------|----------|------|
| WS-UT-001 | 注册自动创建私有空间 | 新用户注册 | — | 自动创建"我的私人空间"工作区，用户为 Owner | ✅ 已实现 |
| WS-UT-002 | 创建项目工作区 | 已登录用户 | name + description | 工作区创建成功，用户为 Owner | ✅ 已实现 |
| WS-UT-003 | 列出我的工作区 | 用户属于多个工作区 | — | 返回所有有成员资格的工作区列表 | ✅ 已实现 |
| WS-UT-004 | 其他用户不可见 | 用户A创建工作区 | 用户B查询 | 用户B的列表中不包含该工作区 | ✅ 已实现 |
| WS-UT-005 | 更新工作区信息 | 用户为 Owner | 新 name + description | 更新成功 | ✅ 已实现 |
| WS-UT-006 | 非Owner更新被拒绝 | 用户为 Member | 试图更新 name | 返回 403 权限不足 | ❌ 待实现 |
| WS-UT-007 | 软删除工作区 | 用户为 Owner | DELETE 请求 | status 变更为 deleted，列表不显示 | ✅ 已实现 |
| WS-UT-008 | 获取工作区目录树 | 存在文档树结构 | GET + parentId | 返回当前层级文档列表 + hasChildren 标记 | ✅ 已实现 |
| WS-UT-009 | 非成员获取目录树被拒绝 | 用户不是工作区成员 | GET 请求 | 返回 403 | ❌ 待实现 |

### 3.3 文档模块

| 用例编号 | 用例名称 | 前置条件 | 输入 | 预期输出 | 状态 |
|----------|----------|----------|------|----------|------|
| DOC-UT-001 | 创建文档 | 用户为工作区成员 | title + docType | 文档创建成功，owner 为当前用户 | ✅ 已实现 |
| DOC-UT-002 | 创建子文档 | 存在父文档 | parentId + title | 子文档创建成功，parent_id 正确 | ✅ 已实现 |
| DOC-UT-003 | 获取文档元数据 | 文档存在 + 有权限 | GET 请求 | 返回 title/summary/permissionBit/favorited 等 | ✅ 已实现 |
| DOC-UT-004 | 更新文档信息 | 有 Edit 权限 | PATCH title/summary | 更新成功 | ✅ 已实现 |
| DOC-UT-005 | 移动文档到根目录 | 有 Manage 权限 | parentId = null | 移动成功，parent_id 变为 null | ✅ 已实现 |
| DOC-UT-006 | 移动到子节点被阻止 | 文档A有子文档B | 将A移到B下 | 返回错误（禁止循环引用） | ✅ 已实现 |
| DOC-UT-007 | 归档文档 | 有 Manage 权限 | POST archive | status 变更为 archived | ✅ 已实现 |
| DOC-UT-008 | 恢复归档文档 | 文档已归档 | POST restore | status 变更为 active | ✅ 已实现 |
| DOC-UT-009 | 软删除文档 | 有 Manage 权限 | DELETE 请求 | status 变更为 deleted，列表不显示 | ✅ 已实现 |
| DOC-UT-010 | 收藏文档 | 有 Read 权限 | POST favorite | favorited = true | ✅ 已实现 |
| DOC-UT-011 | 取消收藏 | 已收藏 | DELETE favorite | favorited = false | ✅ 已实现 |
| DOC-UT-012 | 重复收藏幂等 | 已收藏的文档 | POST favorite 再次 | 不报错，保持 favorited = true | ❌ 待实现 |
| DOC-UT-013 | 无权限访问 | 用户无 Read 权限 | GET 文档 | 返回 403 | ❌ 待实现 |
| DOC-UT-014 | 跨工作区移动被阻止 | 文档属于 WS1 | 移动到 WS2 下的节点 | 返回错误 | ❌ 待实现 |
| DOC-UT-015 | 首页"我创建的" | 用户创建了3个文档 | scope=mine, limit=20 | 返回3个文档，按 createdAt 倒序 | ✅ 已实现 |
| DOC-UT-016 | 首页"最近打开" | 用户打开过文档 | scope=recent | 返回已打开文档，含 openedAt | ✅ 已实现 |
| DOC-UT-017 | 首页"我收藏的" | 用户收藏了文档 | scope=favorite | 返回已收藏文档，含 favoritedAt | ✅ 已实现 |
| DOC-UT-018 | 上传文件型文档 | multipart/form-data | file + parentId + title | 创建 doc_type=file 的文档，设置 sourceStorageKey | ❌ 待实现 |

### 3.4 ACL 权限模块

| 用例编号 | 用例名称 | 前置条件 | 输入 | 预期输出 | 状态 |
|----------|----------|----------|------|----------|------|
| ACL-UT-001 | Owner 拥有完全权限 | 用户为文档 Owner | my-permission | permissionBit = 7 (Read+Edit+Manage) | ✅ 已实现 |
| ACL-UT-002 | 外部用户无权限 | 用户与文档无任何关联 | my-permission | permissionBit = 0 | ✅ 已实现 |
| ACL-UT-003 | 工作区成员默认权限 | 用户为工作区成员，无特殊 ACL | my-permission | permissionBit = 3 (Read+Edit) | ✅ 已实现 |
| ACL-UT-004 | ACL Deny 覆盖 | 为某用户设置显式 Deny ACL | my-permission | permissionBit = 0, 拒绝访问 | ✅ 已实现 |
| ACL-UT-005 | Owner 免疫 Deny | Owner 收到 Deny ACL | my-permission | permissionBit = 7, Owner 优先 | ✅ 已实现 |
| ACL-UT-006 | 显式 User ACL | 为外部用户设置 Read ACL | my-permission | permissionBit = 1 | ✅ 已实现 |
| ACL-UT-007 | Public ACL 只读 | 设置公开只读 ACL | 任意用户 my-permission | permissionBit = 1 | ❌ 待实现 |
| ACL-UT-008 | ACL 继承 | 父文档有 ACL，子文档 inherit=true | 外部用户访问子文档 | 权限等于父文档 ACL | ✅ 已实现 |
| ACL-UT-009 | 创建 ACL 规则 | 有 Manage 权限 | POST ACL | 规则创建成功 | ✅ 已实现 |
| ACL-UT-010 | 非管理者创建 ACL | 仅 Edit 权限 | POST ACL | 返回 403 | ❌ 待实现 |
| ACL-UT-011 | 更新 ACL 规则 | 有 Manage 权限 | PATCH ACL | permission_bit 更新成功 | ✅ 已实现 |
| ACL-UT-012 | 删除 ACL 规则 | 有 Manage 权限 | DELETE ACL | 规则被物理删除 | ✅ 已实现 |
| ACL-UT-013 | 列出 ACL 规则 | 有 Manage 权限 | GET ACL | 返回所有显式 ACL 规则列表 | ✅ 已实现 |
| ACL-UT-014 | 同一主题重复规则 | 已有 user ACL | 再次 POST 相同 subjectId | 返回 409 冲突 | ❌ 待实现 |

### 3.5 表格数据模块

| 用例编号 | 用例名称 | 输入 | 预期输出 | 状态 |
|----------|----------|------|----------|------|
| TBL-UT-001 | 首次访问自动创建 | 不存在 block_id | 自动创建默认标题"多维表格"的表格块 | ✅ 已实现 |
| TBL-UT-002 | 更新单元格 | blockId + row + col + value | 单元格值更新成功 | ✅ 已实现 |
| TBL-UT-003 | 创建记录 | blockId + records | 新记录创建成功 | ✅ 已实现 |
| TBL-UT-004 | 导出数据 | blockId + export | 返回 columns + rows 结构数据 | ✅ 已实现 |
| TBL-UT-005 | 读写二进制快照 | PUT body → GET body | 读取值与写入值一致 | ✅ 已实现 |
| TBL-UT-006 | 更新表格配置 | PATCH config (mode 切换) | mode 更新成功 | ❌ 待实现 |

### 3.6 管理员模块

| 用例编号 | 用例名称 | 输入 | 预期输出 | 状态 |
|----------|----------|------|----------|------|
| ADM-UT-001 | 创建组织 | POST name + description | 组织创建成功 | ❌ 待实现 |
| ADM-UT-002 | 组织名称唯一 | 已存在"实验室A" | 再次 POST name="实验室A" | 返回冲突错误 | ❌ 待实现 |
| ADM-UT-003 | 列出组织 | GET | 返回所有组织列表 | ❌ 待实现 |
| ADM-UT-004 | 编辑组织 | PATCH name | 更新成功 | ❌ 待实现 |
| ADM-UT-005 | 删除组织 | DELETE | 组织被删除 | ❌ 待实现 |
| ADM-UT-006 | 列出用户 | GET ?page=1&pageSize=10 | 分页返回用户列表 | ❌ 待实现 |
| ADM-UT-007 | 创建用户 | POST 用户信息 | 用户创建成功 | ❌ 待实现 |
| ADM-UT-008 | 编辑用户 | PATCH 用户信息 | 更新成功 | ❌ 待实现 |
| ADM-UT-009 | 删除用户 | DELETE | 用户被删除 | ❌ 待实现 |
| ADM-UT-010 | 重置密码 | POST reset-password | 密码被重置 | ❌ 待实现 |
| ADM-UT-011 | 激活/禁用用户 | POST status | status 变更成功 | ❌ 待实现 |
| ADM-UT-012 | 迁移用户组织 | POST move | organization_id 变更 | ❌ 待实现 |
| ADM-UT-013 | 非管理员访问 | 普通用户 Token | 返回 403 | ❌ 待实现 |

---

## 4. 前端测试用例

> **注意**：前端测试当前为零覆盖，以下为待实现的测试计划。

### 4.1 组件单元测试

#### 4.1.1 登录页 (LoginPage)

| 用例编号 | 用例名称 | 输入 | 预期行为 |
|----------|----------|------|----------|
| FE-UT-001 | 渲染登录表单 | — | 显示邮箱/密码输入框 + 登录/注册按钮 |
| FE-UT-002 | 切换到注册模式 | 点击"注册"链接 | 显示额外字段（username, organization 等） |
| FE-UT-003 | 表单验证-空字段 | 不填任何内容点击登录 | 显示必填字段验证错误 |
| FE-UT-004 | 表单验证-无效邮箱 | 输入 "abc" 点击登录 | 显示邮箱格式错误提示 |
| FE-UT-005 | 登录成功跳转 | 输入正确凭据 | 存储 Token，跳转到首页 |
| FE-UT-006 | 登录失败提示 | 输入错误凭据 | 显示错误消息 |

#### 4.1.2 首页 (HomePage)

| 用例编号 | 用例名称 | 前置条件 | 预期行为 |
|----------|----------|----------|----------|
| FE-UT-002 | 渲染三个标签页 | 已登录 | 显示"我创建的"、"最近打开"、"我收藏的"三个Tab |
| FE-UT-003 | 加载我创建的列表 | scope=mine | 列表展示文档标题、更新时间 |
| FE-UT-004 | 加载最近打开列表 | scope=recent | 列表展示文档标题、打开时间 |
| FE-UT-005 | 加载我收藏的列表 | scope=favorite | 列表展示文档标题、收藏时间 |
| FE-UT-006 | 列表为空提示 | 无任何数据 | 显示空状态占位符 |
| FE-UT-007 | 列表加载错误 | API 返回错误 | 显示错误提示信息 |

#### 4.1.3 工作区详情页 (WorkspaceDetailPage)

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| FE-UT-008 | 渲染文档树 | 左侧显示文档树组件，支持展开/折叠 |
| FE-UT-009 | 点击节点加载子文档 | 点击有子文档的节点，展开子节点列表 |
| FE-UT-010 | 点击节点加载详情 | 点击文档节点，右侧显示文档详情 |
| FE-UT-011 | 新建文档按钮 | 点击后弹出创建文档对话框 |
| FE-UT-012 | 成员列表展示 | 工作区 Owner 可见成员管理面板 |

#### 4.1.4 文档编辑器 (DocumentEditorPage)

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| FE-UT-013 | 编辑器加载 | Tiptap 编辑器渲染成功，可编辑 |
| FE-UT-014 | 工具栏展示 | 显示格式化工具栏（标题、加粗、斜体、列表等） |
| FE-UT-015 | 保存按钮显示 | 显示保存状态（保存中/已保存/未保存） |
| FE-UT-016 | ACL 弹窗 | 点击权限设置按钮，弹出 ACLModal |
| FE-UT-017 | 表格渲染 | 内嵌 S2 表格正常渲染 |
| FE-UT-018 | 文件预览 | 文件型文档显示下载/预览界面 |

#### 4.1.5 管理员页 (AdminUsersPage)

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| FE-UT-019 | 用户表格渲染 | 显示分页用户列表 |
| FE-UT-020 | 新增用户弹窗 | 点击"新增"弹出表单 |
| FE-UT-021 | 编辑用户弹窗 | 点击"编辑"弹出预填表单 |
| FE-UT-022 | 删除用户确认 | 点击"删除"弹出确认对话框 |
| FE-UT-023 | 组织管理标签 | 切换组织管理 Tab，显示组织树 |

### 4.2 Hook 测试

#### 4.2.1 useDocumentEditor Hook

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| HK-UT-001 | 加载文档数据 | 调用 API 获取元数据和正文，ydoc 被正确初始化 |
| HK-UT-002 | 保存文档 | 调用 putBody API，saving 状态正确切换 |
| HK-UT-003 | 更新元数据 | 调用 update API，updating 状态正确切换 |
| HK-UT-004 | 错误处理 | API 失败时 error 状态被设置，不崩溃 |
| HK-UT-005 | 文档归档 | 调用 archive API，状态更新 |

#### 4.2.2 useDocumentACL Hook

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| HK-UT-006 | 加载 ACL 列表 | 获取并展示已有规则 |
| HK-UT-007 | 创建 ACL | 成功创建后列表刷新 |
| HK-UT-008 | 更新 ACL | 成功更新后列表刷新 |
| HK-UT-009 | 删除 ACL | 成功删除后列表移除该规则 |

### 4.3 服务层测试

| 用例编号 | 用例名称 | 预期行为 |
|----------|----------|----------|
| SV-UT-001 | api.ts 自动注入 Token | 请求自动带 Authorization header |
| SV-UT-002 | api.ts 401 拦截 | 401 响应自动跳转登录页 |
| SV-UT-003 | authService.login | 成功返回 token + user |
| SV-UT-004 | authService.register | 成功返回注册成功消息 |
| SV-UT-005 | documentService.getBody | 返回 ArrayBuffer |
| SV-UT-006 | documentService.putBody | 携带 X-Body-Type header |
| SV-UT-007 | workspaceService.list | 返回工作区数组 |
| SV-UT-008 | aclService.list | 返回 ACL 规则数组 |
| SV-UT-009 | userService.search | 返回匹配用户列表 |

---

## 5. 集成测试用例

### 5.1 API 接口集成测试

后端已有 21 个集成测试覆盖以下完整链路，测试方式为通过 Go `httptest` 模拟 HTTP 请求：

```
✅ 注册 → 登录 → JWT token 验证
✅ 注册 → 自动创建私有工作区
✅ 创建工作区 → 列出工作区
✅ 创建文档 → 读取文档 → 更新文档
✅ 归档 → 恢复
✅ 文档移动 (根 → 子 → 根)
✅ 文档软删除
✅ 工作区成员邀请 → 角色修改 → 移除
✅ 最后 Owner 保护
✅ ACL 规则 CRUD + 权限预检
✅ 工作区目录树导航
✅ 首页文档列表 (mine/recent/favorite)
✅ 用户模糊搜索
✅ 完整用户旅程 (注册→登录→创建WS→建文档树→加成员→设ACL→继承权限→归档)
```

**待补充的集成测试**：

| 用例编号 | 用例名称 | 测试步骤 | 预期结果 |
|----------|----------|----------|----------|
| INT-UT-001 | 文件型文档上传 | POST multipart/form-data 上传文件 | 创建 doc_type=file 的文档，sourceStorageKey 有值 |
| INT-UT-002 | 文件型文档下载 | GET download 接口 | 返回 sourceStorageKey |
| INT-UT-003 | 二进制正文读写 | PUT body → GET body | 读取值等于写入值 |
| INT-UT-004 | 文档移动跨 workspace 阻止 | 文档在 WS1，尝试移动到 WS2 的节点下 | 返回 400 错误 |
| INT-UT-005 | Admin 创建组织 | POST /admin/organizations | 返回组织详情 |
| INT-UT-006 | Admin 禁用用户 | POST /admin/users/:id/status | 用户 status 变更为 disabled |
| INT-UT-007 | Admin 重置密码 | POST /admin/users/:id/reset-password | 返回新密码 |
| INT-UT-008 | 批量迁移用户 | POST /admin/organizations/:id/move-users | 用户 organization_id 变更 |

### 5.2 WebSocket 协同集成测试

| 用例编号 | 用例名称 | 测试步骤 | 预期结果 |
|----------|----------|----------|----------|
| WS-INT-001 | 连接与握手 | 客户端连接 ws://localhost:3001/documents/:id | 连接建立，State=OPEN |
| WS-INT-002 | SyncStep1/2 同步 | 发送状态向量 → 接收增量 | 收到缺失的 SyncUpdate |
| WS-INT-003 | 增量广播 | 用户A发送 SyncUpdate | 同文档的其他用户收到相同增量 |
| WS-INT-004 | Awareness 传播 | 用户A更新光标 | 用户B收到 Awareness 消息 |
| WS-INT-005 | 刷盘持久化 | 累积 5 次 SyncUpdate | Node 服务调用 PUT /body，Go 后端收到数据 |
| WS-INT-006 | 断开重连 | 客户端断开后重连 | 自动同步最新状态，不丢数据 |
| WS-INT-007 | 多用户并发编辑 | 3 用户同时编辑不同段落 | Y.Doc 合并后内容一致，无丢失 |
| WS-INT-008 | Node 服务内部 Token | PUT /body 携带有误 Token | Go 后端返回 401/403 |

### 5.3 前后端联调测试

| 用例编号 | 用例名称 | 测试方式 | 预期结果 |
|----------|----------|----------|----------|
| E2E-INT-001 | 登录流程 | 浏览器操作 | Token 存储到 localStorage，跳转首页 |
| E2E-INT-002 | 文档加载流程 | 浏览器打开文档 | GET /body 成功，编辑器渲染 |
| E2E-INT-003 | 文档保存流程 | 浏览器编辑 + 保存 | PUT /body 成功，返回 size |
| E2E-INT-004 | ACL 分享流程 | 浏览器弹窗搜索用户 + 授权 | POST ACL 成功，目标用户 my-permission 更新 |
| E2E-INT-005 | 文件上传流程 | 浏览器选择文件 + 上传 | POST upload 成功，文档列表出现新文件 |

---

## 6. 端到端测试场景

### 6.1 管理员完整流程

```
1. 管理员登录 (admin@research.com / admin123)
2. 进入管理后台 → 查看组织机构列表
3. 创建新组织 "分子生物实验室"
4. 进入用户管理 → 创建新用户 "张三"
5. 将张三归属到 "分子生物实验室"
6. 重置张三的密码
7. 禁用用户 "李四" 的账户
8. 验证李四无法登录
9. 重新激活李四账户
10. 删除已离职用户的账户
```

### 6.2 普通用户完整流程

```
1. 注册新用户 "王五" (wangwu@lab.com)
2. 验证自动创建了 "王五的私有空间" 工作区
3. 登录系统
4. 创建 "论文撰写项目" 工作区
5. 在工作区内创建目录结构：
   ├── 文献综述
   │   ├── 国内外研究现状
   │   └── 参考文献
   ├── 实验方案
   └── 初稿
6. 在"国内外研究现状"中撰写内容
7. 邀请 "张三" 加入工作区（member 角色）
8. 将"实验方案"文档单独分享给 "李四" (只读权限)
9. 张三登录后确认可见该工作区和基础文档
10. 李四登录后确认仅可见"实验方案"文档（只读）
11. 王五将"初稿"归档
12. 验证张三无法编辑已归档文档
13. 王五恢复"初稿"归档
14. 王五将"初稿"移动到"文献综述"目录下
15. 王五收藏"参考文献"
16. 首页"我收藏的"列表中出现"参考文献"
```

### 6.3 多人协同编辑场景

```
1. 张三和王五同时打开"国内外研究现状"文档
2. 张三在开头添加一段文字："近年来，深度学习在...领域的应用取得了显著进展。"
3. 王五实时看到张三的编辑内容（通过 WebSocket）
4. 王五的光标位置在张三界面中实时显示
5. 张三选中"显著进展"四个字，添加评论："是否改为'突破性进展'更合适？"
6. 王五收到评论通知，回复："我同意，已修改。"
7. 王五修改文字后，标记评论为"已解决"
8. 两人分别关闭页面
9. 张三重新打开文档，查看版本历史
10. 版本历史展示今天的两次编辑记录：张三的初始编辑和王五的修改
11. 张三将文档还原到第一次编辑后的状态
12. 验证还原后内容为第一次编辑后的样子
```

---

## 7. 性能测试

### 7.1 API 性能测试

| 用例编号 | 测试目标 | 并发数 | 持续时间 | 验收标准 |
|----------|----------|--------|----------|----------|
| PERF-001 | 登录接口 | 50 | 1min | P95 < 200ms, 成功率 100% |
| PERF-002 | 文档列表查询 | 100 | 2min | P95 < 300ms |
| PERF-003 | 文档元数据查询 | 200 | 2min | P95 < 200ms |
| PERF-004 | 权限预检 (my-permission) | 100 | 2min | P95 < 100ms (位运算 O(1)) |
| PERF-005 | 工作区目录树查询 | 50 | 2min | P95 < 300ms (含 JOIN 查询) |
| PERF-006 | 用户搜索 | 50 | 1min | P95 < 200ms |
| PERF-007 | 正文二进制读写 (100KB) | 20 | 2min | P95 < 500ms |

**测试工具**：可使用 `vegeta`、`k6`、`wrk`、`Apache Bench` 等。

### 7.2 协同服务压力测试

| 用例编号 | 测试目标 | 并发连接 | 测试时长 | 验收标准 |
|----------|----------|----------|----------|----------|
| PERF-008 | 单文档多用户连接 | 30 | 5min | 所有连接稳定，无超时断线 |
| PERF-009 | 高频编辑消息 | 10 用户 × 5 条/s | 3min | 消息延迟 < 100ms, 无丢失 |
| PERF-010 | 多文档混合负载 | 50 连接 × 10 文档 | 5min | CPU < 80%, 内存 < 2GB |
| PERF-011 | 刷盘性能 | 100 文档持续刷盘 | 10min | PUT 成功率 100%, Go 后端无阻塞 |

---

## 8. 安全测试

### 8.1 认证安全测试

| 用例编号 | 测试项 | 测试方法 | 预期结果 |
|----------|--------|----------|----------|
| SEC-001 | 无 Token 访问保护接口 | 不带 Authorization header | 返回 401 |
| SEC-002 | 伪造 Token 访问 | 使用任意字符串作为 Token | 返回 401 |
| SEC-003 | 过期 Token 访问 | 使用过期 Token | 返回 401 |
| SEC-004 | 修改他人密码 | 用户A发送 PUT /auth/password 改用户B的密码 | 只能修改自己的密码 |
| SEC-005 | 密码哈希不可逆 | 直接在数据库查看 password_hash | 无法反推出明文 |

### 8.2 ACL 权限安全测试

| 用例编号 | ACL 绕过测试项 | 预期结果 |
|----------|---------------|----------|
| SEC-006 | 非 Owner 删除文档 | 返回 403 |
| SEC-007 | 仅 Read 权限尝试编辑 | 返回 403 |
| SEC-008 | 仅 Edit 权限尝试修改 ACL | 返回 403 |
| SEC-009 | 非成员访问未授权文档 | 返回 403 或文档不可见 |
| SEC-010 | Deny 规则后尝试访问 | 返回 403 |
| SEC-011 | 跨 workspace 操作文档 | 被阻止 |
| SEC-012 | 移动文档到自身子孙节点 | 被拓扑检测拦截 |
| SEC-013 | 移除工作区最后 Owner | 被业务逻辑拦截 |
| SEC-014 | 非管理员访问 admin 接口 | 返回 403 |
| SEC-015 | 无内部 Token PUT body | 返回 403 |

### 8.3 常见攻击测试

| 用例编号 | 攻击类型 | 测试方法 | 预期结果 |
|----------|----------|----------|----------|
| SEC-016 | SQL 注入 | URL 参数中注入 `'; DROP TABLE users; --` | GORM 参数化查询防护，无影响 |
| SEC-017 | XSS 注入 | 在文档标题中输入 `<script>alert(1)</script>` | 前端渲染时转义或过滤 |
| SEC-018 | 路径遍历 | 请求 `/api/v1/../../etc/passwd` | Gin 路由不匹配，返回 404 |
| SEC-019 | 超长输入 | 文档标题填写 10KB 字符串 | 返回 400 字段过长 |
| SEC-020 | 并发请求竞态 | 同时发起多个文档删除请求 | 第一个成功，其余幂等或报错 |

---

## 9. 测试执行计划

| 阶段 | 测试活动 | 负责 | 预计完成 |
|------|----------|------|----------|
| **Phase 0** | 当前已有 25 个后端测试持续运行 | 开发 | ✅ 已完成 |
| **Phase 1-1** | 补充后端单元测试缺口（ADM、DOC 上传、边界用例） | 开发 | 1 周 |
| **Phase 1-2** | 搭建前端测试框架（Jest/Vitest + Testing Library） | 开发 | 1 周 |
| **Phase 2** | 编写前端组件/Hook/服务层单元测试 (50+ 用例) | 开发 | 2 周 |
| **Phase 3** | WebSocket 协同服务集成测试 | 开发 | 1 周 |
| **Phase 4-1** | 搭建 E2E 测试框架（Playwright） | QA | 1 周 |
| **Phase 4-2** | 编写端到端测试场景 (10+ 场景) | QA | 2 周 |
| **Phase 5** | 性能测试 | QA/Dev | 1 周 |
| **Phase 6** | 安全测试 | QA/Security | 1 周 |

---

## 附录 A：冒烟测试脚本

每次发版前运行以下快速冒烟检查：

### A.1 后端单元测试

```powershell
cd backend
go test ./internal/... -v -count=1
```

预期：25+ 测试全部 PASS。

### A.2 管理员 API 冒烟测试

```powershell
# Windows PowerShell
$env:GO_INTERNAL_TOKEN = "test-internal-token-123"
$env:JWT_SECRET = "test-jwt-secret-key-for-smoke-test"
$env:DB_DSN = "smoke-test.db"

Start-Process -NoNewWindow -FilePath "go" -ArgumentList "run", "." -WorkingDirectory "backend"

Start-Sleep -Seconds 3

$LOGIN = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"admin@research.com","password":"admin123"}'

$TOKEN = $LOGIN.data.accessToken

$ORGS = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/organizations" `
  -Headers @{Authorization="Bearer $TOKEN"}

Write-Host "Organizations: $($ORGS.code)" -ForegroundColor Green

$USERS = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users?page=1&pageSize=10" `
  -Headers @{Authorization="Bearer $TOKEN"}

Write-Host "Users count: $($USERS.data.items.Count)" -ForegroundColor Green

Write-Host "Smoke test PASSED" -ForegroundColor Green
```

### A.3 前端冒烟检查

```powershell
cd Frontend
pnpm run build
```

预期：Vite 构建成功，无 TypeScript 错误。

---

**文档编制**：AI 辅助生成  
**最后更新**：2026-05-29
