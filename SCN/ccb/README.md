# CCB v3 - AI伙伴框架

基于任务规划器的智能对话系统，支持人格化交互、记忆管理和提醒功能。

## 核心特性

- **任务规划器** - AI自主规划任务，替代传统意图分类器
- **记忆双轨制** - 即时存储 + 后台压缩，LanceDB向量检索
- **人格系统** - 按用户动态绑定人格，风格化自然融入
- **插件架构** - 核心/扩展插件分离，灵活扩展
- **提醒状态机** - 完整生命周期管理，支持反馈确认
- **LLM分段配置** - 任务级模型选择 + 自动降级

## 架构概览

```
入口层 → 人格界面层 → 任务规划层 → 插件能力层 → 核心框架层 → LLM服务层 → 数据存储层
```

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 快速开始

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 生产运行
bun start
```

## 项目结构

```
ccb/
├── src/
│   ├── core/          # 核心框架（StateGraph, EventBus, ToolRegistry）
│   ├── memory/        # 记忆系统（即时存储, 压缩整理, 向量检索）
│   ├── persona/       # 人格系统（运行时, 配置加载, 风格化）
│   ├── nodes/         # 业务节点（TaskPlanner, Chat）
│   └── plugins/       # 插件系统
├── config/            # 配置文件
├── prompts/           # Prompt模板
└── docs/              # 文档
```

## 技术栈

- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: SQLite (结构化) + LanceDB (向量)
- **LLM**: 可配置多模型支持

## 版本历史

- **v3** - 任务规划器架构，记忆双轨制，插件系统
- **v2** - 意图分类器架构（见 `ccb-archive/ccb-v2`）
- **v1** - 基础版本（见 `ccb-archive/ccb-v1`）
- **v0** - 原型设计（见 `ccb-archive/ccb-zero`）

## License

MIT
