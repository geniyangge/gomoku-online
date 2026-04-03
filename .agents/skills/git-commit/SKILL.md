---
name: git-commit
description: '使用 Conventional Commits 规范执行 git 提交，支持基于差异分析提交类型、智能暂存与提交信息生成。用户要求提交、更改代码后创建提交，或提到 "/commit" 时使用。支持：(1) 根据改动自动识别 type 和 scope，(2) 基于 diff 生成规范提交信息，(3) 可交互覆盖 type/scope/description，(4) 按逻辑分组智能暂存文件。提交信息统一使用中文。'
license: MIT
allowed-tools: Bash
---

# 使用 Conventional Commits 提交 Git

## 概述

使用 Conventional Commits 规范创建标准化、语义化的 git 提交。需要基于实际 diff 分析，判断合适的 type、scope 和提交信息。所有生成的提交标题与正文都应使用中文。

## Conventional Commit 格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## 提交类型

| 类型       | 用途                     |
| ---------- | ------------------------ |
| `feat`     | 新功能                   |
| `fix`      | 缺陷修复                 |
| `docs`     | 仅文档改动               |
| `style`    | 格式或样式调整，无逻辑改动 |
| `refactor` | 重构，不新增功能也不修复缺陷 |
| `perf`     | 性能优化                 |
| `test`     | 新增或更新测试           |
| `build`    | 构建系统或依赖调整       |
| `ci`       | CI 或配置改动            |
| `chore`    | 维护性或杂项改动         |
| `revert`   | 回滚提交                 |

## 破坏性变更

```
# 在 type 或 scope 后添加感叹号
feat!: 移除已废弃接口

# 使用 BREAKING CHANGE 页脚说明
feat: 支持配置继承其他配置

BREAKING CHANGE: `extends` 字段行为已变更
```

## 工作流

### 1. 分析差异

```bash
# 如果已有暂存文件，优先查看暂存区差异
git diff --staged

# 如果暂存区为空，再查看工作区差异
git diff

# 同时检查状态
git status --porcelain
```

### 2. 暂存文件（如有需要）

如果当前没有已暂存文件，或者需要重新按逻辑分组改动：

```bash
# 暂存指定文件
git add path/to/file1 path/to/file2

# 按模式暂存
git add *.test.*
git add src/components/*

# 不要使用交互式暂存，当前环境不支持
```

**绝不要提交敏感信息**，例如 `.env`、`credentials.json`、私钥等。

### 3. 生成提交信息

分析 diff 时需要判断：

- **Type**：这次改动属于什么类型？
- **Scope**：影响了哪个模块或区域？
- **Description**：用一行中文概括改动，简洁明确，建议不超过 72 个字符

提交信息要求：

- `type` 和 `scope` 保持 Conventional Commits 规范写法，例如 `feat(room): 支持房间搜索`
- 冒号后的标题必须使用中文
- 正文与页脚如有需要，也必须使用中文
- 表达应说明改动目的，避免只罗列文件名

### 4. 执行提交

```bash
# 单行提交
git commit -m "<type>[scope]: <中文描述>"

# 带正文或页脚的多行提交
git commit -m "$(cat <<'EOF'
<type>[scope]: <中文描述>

<可选正文>

<可选页脚>
EOF
)"
```

## 最佳实践

- 一个提交只包含一个逻辑改动
- 标题简短明确，优先写“为什么改”，而不是机械罗列“改了什么”
- 使用规范前缀，例如 `feat`、`fix`、`refactor`
- 可在页脚中引用 issue，例如 `关闭 #123`、`关联 #456`
- 标题尽量控制在 72 个字符以内
- 提交信息统一使用中文

## Git 安全协议

- 绝不要修改 git config
- 未经用户明确要求，绝不要执行破坏性命令（如 `--force`、`hard reset`）
- 除非用户明确要求，否则绝不要跳过 hooks（如 `--no-verify`）
- 绝不要向 `main` 或 `master` 强制推送
- 如果提交因 hooks 失败，应修复问题后创建新的提交，不要 amend
