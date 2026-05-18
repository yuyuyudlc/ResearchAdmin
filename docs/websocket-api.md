# WebSocket 协同编辑 API 文档

## 概述

Node.js Yjs 协同编辑服务，负责 WebSocket 连接管理、CRDT 冲突合并、以及向 Go 后端定期回写合并后的文档快照。

- **服务地址**: `ws://<host>:3001`
- **协议**: Yjs Sync Protocol + Awareness Protocol（由 y-websocket 实现）

---

## 连接

### 建立连接

```
ws://<host>:3001/documents/{documentId}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `documentId` | UUID v4 (36字符) | 是 | 文档唯一 ID，格式 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### 连接示例

```javascript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// 1. 创建本地 YDoc（CRDT 数据结构，驻留在浏览器内存，不走网络）
const ydoc = new Y.Doc()

// 2. 建立 WebSocket 连接，绑定 YDoc
//    y-websocket 自动处理：首次握手(SyncStep1/2) + 后续增量 update 收发
const wsProvider = new WebsocketProvider(
  'ws://localhost:3001',
  '/documents/550e8400-e29b-41d4-a716-446655440000',  // 文档 UUID
  ydoc
)

// 3. 本地编辑 —— Yjs 生成增量 update，通过 WebSocket 自动广播给其他用户
const ytext = ydoc.getText('content')
ytext.insert(0, 'Hello World')
```

> **关键区分**：
> - `ydoc` 是本地 CRDT 对象，不传输。传输的是它产生的 **增量 update**（二进制，通常几十字节）
> - 首次连接时，客户端发送的是 **状态向量**（已有哪些更新），不是整个 YDoc
> - 服务端对比差异后，只返回客户端 **缺失的 update**，也不是整个 YDoc

### 连接失败

| 场景 | Close Code | 说明 |
|------|-----------|------|
| 路径格式错误 | 4000 | URL 路径不符合 `/documents/{UUID}` 格式 |
| 客户端主动断开 | 1000 | 正常关闭 |

---

## 消息格式

WebSocket 传输的是 **二进制帧**（Binary Frame），由 y-websocket 处理编解码。每条消息的第一个字节为消息类型。

### 消息类型一览

```
Byte 0 = 0  →  SyncStep1   客户端→服务端：发送本地状态向量，请求缺失的 update
Byte 0 = 1  →  SyncStep2   服务端→客户端：返回差异 update
Byte 0 = 2  →  SyncUpdate  双向广播：增量编辑操作
         3  →  保留
        ...
Byte 0 = ?? →  未来扩展
```

---

### 1. SyncStep1 — 握手请求（客户端 → 服务端）

客户端连接后**立即发送**，携带本地 YDoc 的状态向量（State Vector），告诉服务端「我已经有哪些更新了」。

```
┌─────────┬──────────────────────────────────────┐
│ Byte 0  │ Byte 1 ...                           │
│ 0x00    │ lib0 编码的状态向量 (State Vector)    │
└─────────┴──────────────────────────────────────┘
```

状态向量格式：一组 `(clientID, clock)` 对，表示该客户端已收到的每个编辑者对应的最新操作序号。

如果客户端本地没有任何状态（首次打开文档），body 为空。

**示例（十六进制）**：
```
00 00  ← SyncStep1，空状态向量 = 请求全量同步
```

```
00 05 01 02 03 04 05 06 07  ← SyncStep1 + 状态向量（varint 编码的长度 + 数据）
```

**客户端代码等价**：
```javascript
// y-websocket 内部自动发送，前端无需手动构造
const encoder = encoding.createEncoder()
encoding.writeVarUint(encoder, 0)              // message type = SyncStep1
syncProtocol.writeSyncStep1(encoder, ydoc)     // 写入本地状态向量
ws.send(encoding.toUint8Array(encoder))        // 二进制发送
```

---

### 2. SyncStep2 — 握手响应（服务端 → 客户端）

服务端收到 SyncStep1 后，对比客户端的状态向量和服务端的 YDoc 状态，**只发送客户端缺失的 update**。

```
┌─────────┬──────────────────────────────────────┐
│ Byte 0  │ Byte 1 ...                           │
│ 0x01    │ lib0 编码的差异 update                 │
└─────────┴──────────────────────────────────────┘
```

如果客户端已经是最新状态，body 为空。

**示例**：
```
01 02 01 ...  ← SyncStep2 + 部分 update 数据
01 00          ← SyncStep2，空 = 客户端已是最新
```

---

### 3. SyncUpdate — 增量编辑（双向广播）

用户每次编辑（打字、删除、格式调整等），Yjs 生成一个 **增量 update**，由客户端发给服务端。服务端应用到本地 YDoc 后，**广播给同一文档的其他所有连接**，但不回发给发送者。

```
┌─────────┬──────────────────────────────────────┐
│ Byte 0  │ Byte 1 ...                           │
│ 0x02    │ Yjs update 二进制 (Y.encodeStateAsUpdate 的增量部分) │
└─────────┴──────────────────────────────────────┘
```

**示例**：
```
02 04 01 03 ...  ← SyncUpdate + Yjs 增量数据
```

增量数据内容由 Yjs 内部编码，包含：
- 操作类型（插入/删除）
- 目标数据结构（Y.Text / Y.Array / Y.Map 等）
- 位置和内容
- 编辑者 clientID 和时钟信息（用于 CRDT 冲突解决）

**重要**：这里传的是**增量**，不是全量。一个「输入一个字符 a」可能只有十几个字节。

---

### 4. Awareness — 用户感知（双向广播）

Awareness 消息使用 **独立的消息通道**（message type ≠ 0/1/2），用于广播非文档内容的「元信息」：

- 用户在线/离线状态
- 光标位置（哪个文档、第几行第几列）
- 当前选区范围

```
┌─────────┬──────────────────────────────────────┐
│ Byte 0  │ Byte 1 ...                           │
│ 0x01    │ lib0 编码的 awareness 状态             │
└─────────┴──────────────────────────────────────┘
```

Awareness 状态是一个 JSON-like 的 key-value 结构，包含：
```json
{
  "user": {
    "name": "张三",
    "color": "#ff0000",
    "colorLight": "#ffcccc"
  },
  "cursor": { "anchor": ..., "head": ... },
  "currentDocument": "550e8400-..."
}
```

---

### 消息格式总结

| 类型 | Byte 0 | 方向 | 携带内容 |
|------|--------|------|---------|
| SyncStep1 | `0x00` | 客户端→服务端 | 本地状态向量（可能为空） |
| SyncStep2 | `0x01` | 服务端→客户端 | 差异 update（可能为空） |
| SyncUpdate | `0x02` | 双向广播 | Yjs 增量 update |
| Awareness | awareness 协议内部编码 | 双向广播 | 光标/选区/在线状态 |

> 以上消息格式由 y-websocket + y-protocols 自动处理，**前端接入时无需手动编解码**，使用 `y-websocket` 的 `WebsocketProvider` 即可。此处列出供调试和自定义客户端参考。

---

## 同步流程

### 新客户端接入

```
客户端                     Node.js 服务
  |                            |
  |--- SyncStep1 (本地状态) --->|  客户端发送本地状态向量
  |                            |
  |<-- SyncStep2 (服务端差异) --|  服务端返回缺失的 update
  |                            |
  |<-- Awareness 广播 ---------|  其他用户的光标、选区
  |                            |
  |=== 实时协同编辑开始 =======|
```

### 编辑广播

```
用户A                       Node.js                      用户B
  |                           |                           |
  |--- SyncUpdate (增量) ---->|                           |
  |                           |--- SyncUpdate (广播) ---->|
  |                           |                           |
  |                           |--- scheduleFlush -------->| (延迟合并)
  |                           |                           |
  |                           |--- PUT /body -----------> Go 后端 (全量快照)
```

---

## 持久化策略

- **触发条件**: 每 1 秒 或 累积 5 次更新，满足其一即触发
- **强制 flush**: WebSocket 连接关闭时，若有未写入的待处理更新，立即触发 flush 写入 Go
- **写入方式**: HTTP PUT 到 Go 后端 `/api/v1/documents/{documentId}/body`
- **写入格式**: `Y.encodeStateAsUpdate` 全量编码的二进制，`Content-Type: application/octet-stream`
- **幂等性**: 每次 flush 写全量快照，丢失一次不影响最终一致性

---

## 健康检查

### GET /health

```
http://<host>:3001/health
```

**响应**:
```json
{
  "status": "ok",
  "uptime": 12345.678
}
```

---

## 注意事项

1. **连接前先鉴权**: WebSocket 连接本身不做鉴权，前端应在打开文档时通过 Go 后端接口完成权限校验后再建立 WebSocket 连接
2. **文档 ID 是唯一凭证**: 同一个 UUID 的所有 WebSocket 连接共享同一个 YDoc，实现多人实时协同
3. **不支持跨文档通信**: 每个连接只能编辑一个文档
4. **断开重连**: 前端应在 WebSocket 断开后自动重连，重连后 y-websocket 会自动同步最新状态
