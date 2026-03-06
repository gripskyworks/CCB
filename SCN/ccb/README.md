# CCB v4.0.0 - LangGraph 重构版

> 智能提醒与记忆助手，基于 LangGraph 框架

## 项目结构

```
ccb/
├── src/
│   ├── tools/          # LangGraph 工具定义（新建）
│   ├── reminder/       # 提醒调度器（复用 v03）
│   │   └── reminder-scheduler.ts
│   ├── memory/         # 记忆管理（复用 v03）
│   │   ├── manager.ts
│   │   └── vector-store.ts
│   ├── data/           # 数据层（复用 v03）
│   │   └── db.ts
│   ├── llm/            # LLM Provider（复用 v03）
│   │   └── provider.ts
│   ├── persona/        # 人格系统（复用 v03）
│   │   └── loader.ts
│   └── cli.ts          # CLI 入口（待创建）
├── config/
│   ├── llm.toml        # LLM 配置
│   └── prompts/        # 人设 prompt
├── data/
│   ├── preset/         # 预置向量库
│   │   └── preset_exusiai.lance/
│   └── users/          # 用户数据
│       └── usr_admin/
│           ├── ccb.db          # SQLite
│           └── memories.lance/ # 向量记忆
└── package.json        # 依赖（已添加 LangGraph）
```

## 核心变更（v03 → v04）

| 模块 | v03 | v04 |
|------|-----|-----|
| 流程编排 | 自写 StateGraph | **LangGraph** |
| 状态持久化 | MemoryCheckpointer | **SqliteSaver** |
| 工具系统 | 自写 ToolRegistry | **LangGraph Tools (zod)** |
| 任务规划 | TaskPlanner | **createReactAgent** |

## 开发计划

### Day 1（今天）
- [ ] 安装依赖
- [ ] 创建 LangGraph Agent 入口
- [ ] 定义核心工具（reminder_create, memory_store）
- [ ] 跑通最小流程

### Day 2（明天）
- [ ] 时间解析引擎
- [ ] 提醒查询/更新工具
- [ ] CLI 完整功能
- [ ] 测试与修复

## 快速开始

```bash
cd ccb
bun install

# 配置 API Key
# 编辑 config/llm.toml

# 运行
bun start
```

## 相关文档

- [核心资产清单](../ccb-archive/ASSETS.md)
- [v0 设计文档](../ccb-archive/ccb-v0/CCB-智能提醒系统架构设计.md)
- [架构借鉴方案](../ccb-archive/ccb-v0/CCB架构借鉴方案.md)
