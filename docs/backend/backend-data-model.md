# 科研项目文档管理系统后端数据模型设计

## 1. 文档目标

本文档用于定义科研项目文档管理系统的核心实体、字段建议、关系模型和建模约束，作为数据库表设计与 GORM 模型设计的基础。

本文档当前以关系型数据库为核心展开，不包含索引引擎、对象存储和 Yjs 内部数据结构的详细实现。

## 2. 设计原则

- 以 `documents` 为中心组织主要业务关系。
- 元数据、权限、历史、评论、审计分表管理，不在一张大表中堆叠。
- 用“文档主表 + 版本表”管理历史，不直接覆盖过去状态。
- 用户组与角色分离建模，避免共享关系和系统权限混淆。
- 评论、权限、审计都必须具备明确的操作者和时间信息。

## 3. 核心实体总览

建议至少包含以下实体：

- `users`
- `roles`
- `user_roles`
- `groups`
- `group_members`
- `projects`
- `documents`
- `document_versions`
- `document_tags`
- `document_tag_relations`
- `doc_acl`
- `comments`
- `audit_logs`
- `collaboration_sessions`
- `backup_jobs`

如果后续需要更细粒度的评论回复或任务流转，可以继续补充子表。

## 4. 核心表设计

### 4.1 users

用途：系统用户主体。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| username | varchar(64) | 用户名或展示名，非唯一 |
| email | varchar(128) | 邮箱，唯一 |
| organization | varchar(128) | 所属组织、实验室或课题组 |
| avatar_url | varchar(255) | 用户头像 URL |
| signature | varchar(255) | 个性签名 |
| professional_title | varchar(32) | 职称枚举 |
| supervisor | varchar(64) | 上级、导师或负责人名称 |
| password_hash | varchar(255) | 密码哈希 |
| display_name | varchar(64) | 展示名称 |
| status | varchar(32) | 用户状态，例如 active、disabled |
| last_login_at | datetime | 最近登录时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

说明：

- 不保存明文密码。
- 如果后续接入单点登录，可将密码字段改为可空。
- `professional_title` 建议取值：`professor`、`associate_professor`、`lecturer`、`researcher`、`engineer`、`doctoral_student`、`master_student`、`other`。

### 4.2 roles

用途：系统级角色，例如管理员、普通用户。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| code | varchar(32) | 角色编码，唯一 |
| name | varchar(64) | 角色名称 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

说明：

- 角色用于系统级管理能力，不直接表示文档共享权限。

### 4.3 user_roles

用途：用户与角色多对多关系。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| user_id | bigint | 用户 ID |
| role_id | bigint | 角色 ID |
| created_at | datetime | 创建时间 |

### 4.4 groups

用途：文档共享中的批量授权对象。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| name | varchar(128) | 用户组名称 |
| code | varchar(64) | 用户组编码，唯一 |
| description | varchar(255) | 描述 |
| owner_user_id | bigint | 创建人或负责人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 4.5 group_members

用途：用户组成员关系。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| group_id | bigint | 用户组 ID |
| user_id | bigint | 用户 ID |
| created_at | datetime | 创建时间 |

约束建议：

- `group_id + user_id` 建唯一索引。

### 4.6 projects

用途：科研项目或项目空间。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| code | varchar(64) | 项目编号，唯一 |
| name | varchar(128) | 项目名称 |
| owner_user_id | bigint | 项目负责人 |
| stage | varchar(64) | 项目阶段 |
| description | text | 项目描述 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

说明：

- 文档可以挂在项目下，项目层也可作为继承授权的作用域。

### 4.7 documents

用途：系统中的文档主实体。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| title | varchar(255) | 文档标题 |
| summary | text | 摘要 |
| project_id | bigint | 所属项目 |
| owner_user_id | bigint | 文档拥有者 |
| doc_type | varchar(32) | 文档类型，建议取值 file、rich_text |
| file_type | varchar(64) | 文件格式，例如 pdf、docx、xlsx |
| source_storage_key | varchar(255) | 文件存储键或正文主引用 |
| current_version_id | bigint | 当前正式版本 ID |
| stage | varchar(64) | 研究阶段 |
| principal_name | varchar(128) | 负责人名称或展示字段 |
| status | varchar(32) | draft、active、archived |
| visibility_scope | varchar(32) | 默认可见范围策略 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| archived_at | datetime | 归档时间，可空 |

说明：

- `source_storage_key` 对文件型文档指向文件存储位置，对富文本型文档可指向初始正文快照或主文档标识。
- `current_version_id` 便于快速定位当前正式版本。

### 4.8 document_versions

用途：文档历史快照索引。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| document_id | bigint | 文档 ID |
| version_no | int | 版本序号 |
| snapshot_type | varchar(32) | 例如 upload、save、restore |
| content_ref | varchar(255) | 快照内容引用地址 |
| summary | varchar(255) | 变更说明 |
| operator_user_id | bigint | 操作人 |
| based_on_version_id | bigint | 恢复或派生来源版本，可空 |
| created_at | datetime | 创建时间 |

说明：

- 快照内容建议通过引用指向对象存储或协同状态快照，而不是直接把大文本塞入索引表。
- `version_no` 在单文档下唯一。

### 4.9 document_tags

用途：标签字典。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| name | varchar(64) | 标签名称，唯一 |
| created_at | datetime | 创建时间 |

### 4.10 document_tag_relations

用途：文档与标签多对多关系。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| document_id | bigint | 文档 ID |
| tag_id | bigint | 标签 ID |
| created_at | datetime | 创建时间 |

约束建议：

- `document_id + tag_id` 建唯一索引。

### 4.11 doc_acl

用途：文档 ACL 授权表（单用户与用户组统一建模，位掩码存权）。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| doc_id | bigint | 文档 ID |
| subject_type | tinyint | 授权对象类型，1=user，2=group，3=tenant |
| subject_id | bigint | 授权对象 ID |
| permission_bit | int | 权限位掩码，示例：1/3/7/8 |

说明：

- 通过 `subject_type + subject_id` 区分用户授权和用户组授权来源。
- 文档拥有者 `owner` 不必写入 ACL 行，可在权限计算时直接赋予 `READ | EDIT | MANAGE`。
- 系统管理员属于系统级角色，建议由 `roles/user_roles` 体系单独判定。
- 建议位常量：`READ=1`、`EDIT=2`、`MANAGE=4`、`DENY=8`。
- `DENY` 为显式拒绝位，权限决议中优先级最高。

### 4.12 comments

用途：评论、回复、处理状态统一存储。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| document_id | bigint | 文档 ID |
| version_id | bigint | 所属版本，可空 |
| parent_id | bigint | 父评论 ID，可空 |
| author_user_id | bigint | 评论人 |
| content | text | 评论内容 |
| anchor_data | json | 片段定位信息 |
| status | varchar(32) | open、resolved、closed |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

说明：

- 用 `parent_id` 即可表达回复链路，无需单独拆回复表。
- `anchor_data` 建议保存片段定位、范围信息或 Yjs/Tiptap 相关定位引用。

### 4.13 audit_logs

用途：记录系统关键操作。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| event_type | varchar(64) | 事件类型 |
| target_type | varchar(64) | 目标类型，例如 document、permission |
| target_id | bigint | 目标 ID |
| operator_user_id | bigint | 操作人 |
| action_result | varchar(32) | success、failed |
| detail | json | 事件详情 |
| ip | varchar(64) | 操作来源 IP |
| user_agent | varchar(255) | 客户端标识 |
| created_at | datetime | 创建时间 |

建议纳入审计的事件：

- 登录
- 上传文档
- 更新文档元数据
- 下载文档
- 正式保存
- 恢复历史版本
- 调整共享权限
- 转移拥有者
- 删除文档
- 备份与恢复任务执行

### 4.14 collaboration_sessions

用途：记录协同会话状态或连接票据。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| document_id | bigint | 文档 ID |
| user_id | bigint | 参与用户 |
| session_token | varchar(255) | 会话票据或连接标识 |
| status | varchar(32) | active、closed |
| connected_at | datetime | 建连时间 |
| disconnected_at | datetime | 断连时间，可空 |
| created_at | datetime | 创建时间 |

说明：

- 如果实时协同完全交由独立 provider 管理，该表也可仅用于审计或在线状态展示。

### 4.15 backup_jobs

用途：记录备份与恢复任务。

关键字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| job_type | varchar(32) | backup、restore |
| status | varchar(32) | pending、running、success、failed |
| storage_ref | varchar(255) | 备份产物地址 |
| started_by | bigint | 发起人 |
| result_message | varchar(255) | 结果说明 |
| started_at | datetime | 开始时间 |
| finished_at | datetime | 完成时间，可空 |
| created_at | datetime | 创建时间 |

## 5. 核心关系说明

主要关系如下：

- 一个用户可以拥有多个角色。
- 一个用户可以属于多个用户组。
- 一个项目下可以有多个文档。
- 一个文档只能有一个当前拥有者。
- 一个文档可以有多条历史版本。
- 一个文档可以有多条 ACL 记录，覆盖用户与用户组授权。
- 一个文档可以有多条评论，评论之间通过 `parent_id` 形成回复树。

关系概览：

```text
users
├── user_roles -> roles
├── group_members -> groups
├── documents.owner_user_id
├── document_versions.operator_user_id
├── comments.author_user_id
└── audit_logs.operator_user_id

documents
├── project_id -> projects
├── current_version_id -> document_versions
├── document_versions
├── doc_acl
├── comments
└── collaboration_sessions
```

## 6. 索引建议

至少建议建立以下索引：

- `users.email` 唯一索引
- `groups.code` 唯一索引
- `projects.code` 唯一索引
- `documents.project_id`
- `documents.owner_user_id`
- `documents.status`
- `documents.updated_at`
- `document_versions.document_id + version_no` 唯一索引
- `doc_acl.doc_id + subject_type + subject_id` 唯一索引
- `doc_acl.subject_type + subject_id` 索引
- `comments.document_id`
- `comments.parent_id`
- `audit_logs.target_type + target_id`
- `audit_logs.operator_user_id + created_at`

## 7. 关键建模决策

### 7.1 文档与版本分离

`documents` 保存当前状态和检索元数据，`document_versions` 保存正式历史快照。这样可以避免历史数据污染当前文档查询性能。

### 7.2 共享权限不直接挂在用户表

共享关系是“文档对用户/用户组”的授权关系，因此单独建权限表，而不是在用户表中追加权限字段。

在实现层建议使用位掩码整数 `permission_bit` 存储授权，以降低空间占用和权限合并计算成本。

### 7.3 评论与正文解耦

评论依附文档和可选版本存在，但不直接嵌入正文。这样恢复历史和重新定位评论时更容易处理。

### 7.4 审计日志单独存储

审计日志读取模式和写入模式与主业务不同，必须独立建模，避免影响主流程表的结构稳定性。

## 8. 当前阶段可先实现的最小表集合

如果先做 MVP，建议优先落以下表：

- `users`
- `groups`
- `group_members`
- `projects`
- `documents`
- `document_versions`
- `doc_acl`
- `comments`
- `audit_logs`

等检索、备份、实时协同进一步落地后，再补全文索引表或扩展存储模型。
