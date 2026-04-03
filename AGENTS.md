# AGENTS.md

本仓库是一个实时五子棋项目，后端使用 TypeScript + Koa，前端使用 Vue 3 + Vite。
本文件面向在 `D:\0-cry\5-other\game` 中工作的智能编码代理。

## 仓库结构

- `backend/`：Koa + Socket.IO 服务端，包含 MongoDB 集成与游戏状态管理。
- `frontend/`：Vue 3 + Vite 客户端，包含棋盘渲染、路由与 Socket 客户端逻辑。
- `start.sh`、`start.bat`、`start_servers.bat`：本地启动辅助脚本。
- 仓库根目录当前没有统一的工作区包管理配置；前后端是两个独立的 npm 项目。

## 代理优先级

- 改动尽量限定在当前所触及的包内。
- 优先做最小、精准的修改，避免无关的大范围重构。
- 保持现有架构不变：房间/对局逻辑以内存管理为主，聊天和会话依赖 MongoDB。
- 除非任务明确需要，否则不要引入新工具链或新依赖。
- 不要假设仓库存在 pnpm、turbo、bun、nx 等 monorepo 运行器。

## 当前规则文件情况

- 未发现 `.cursorrules` 文件。
- 未发现 `.cursor/rules/` 目录下的规则文件。
- 未发现 `.github/copilot-instructions.md` 文件。
- 如果之后新增这些文件，应将其视为更高优先级指令，并在后续修改中合并遵循。

## 环境与启动说明

- 需要分别在 `backend/` 和 `frontend/` 中执行 `npm install` 安装依赖。
- 后端启动依赖 MongoDB 相关环境变量，否则无法正常连接数据库。
- 前端开发服务器会将 `/socket.io` 代理到后端。
- 当前代码与脚本中使用的开发端口为：后端 `8090`，前端 `8091`。

## 构建、运行与格式化命令

### 后端（`backend/package.json`）

- 安装依赖：`npm install`
- 开发启动：`npm run dev`
- 构建：`npm run build`
- 运行构建产物：`npm run start`
- 格式化源码：`npm run format`

### 前端（`frontend/package.json`）

- 安装依赖：`npm install`
- 开发启动：`npm run dev`
- 构建：`npm run build`
- 预览生产构建：`npm run preview`
- 格式化源码：`npm run format`

### 快速启动脚本

- Windows：`start.bat` 或 `start_servers.bat`
- Linux/macOS：`./start.sh`
- 这些脚本会先执行 `npm install`，再启动前后端开发服务。

## Lint、类型检查与测试现状

- 前后端都没有单独的 lint 脚本。
- 仓库中未发现 ESLint、Biome 或同类 lint 配置。
- 仓库中未配置专门的测试框架，未发现 `vitest`、`jest`、`playwright`、`pytest` 等测试配置。
- 当前不存在可直接运行的“单个测试”命令，因为项目目前没有测试体系。

## 代理应使用的验证命令

进行修改后，应使用最小且最相关的验证方式：

- 后端编译检查：在 `backend/` 下执行 `npm run build`
- 前端编译/类型检查/构建检查：在 `frontend/` 下执行 `npm run build`
- 后端格式化：在 `backend/` 下执行 `npm run format`
- 前端格式化：在 `frontend/` 下执行 `npm run format`

如果同时修改了前后端，应分别运行两个包的构建命令。

## 关于单测与单个测试

由于仓库当前没有测试框架：

- 除非你在任务中新增了测试框架和测试用例，否则不要声称已经运行了单元测试。
- 如果用户要求运行单个测试，应明确说明：当前仓库尚未配置测试体系，因此没有可用的单测命令。
- 如果未来新增测试，请在本文件中补充清楚以下命令：
  - 全量测试命令
  - watch 模式命令
  - 单文件测试命令
  - 按测试名筛选的单个测试命令

## TypeScript 与编译器约束

- 前后端都启用了 `strict: true`，修改时必须保持严格类型约束。
- 前端还启用了 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`。
- 后端构建产物输出到 `backend/dist/`，不要手动编辑 `dist/` 中的生成文件。
- 前端使用 Vite 路径别名 `@` 指向 `frontend/src`。
- 若修改前后端共享的事件或数据结构，应同步更新 `backend/src/types.ts` 和 `frontend/src/types.ts`。

## 格式化规范

根据前后端各自的 `.prettierrc`，应遵循以下规则：

- 不使用分号。
- 使用单引号。
- 缩进为 2 个空格。
- 在 ES5 合法范围内保留尾随逗号。
- 行宽控制在 100 左右。
- Vue 单文件组件中，`script` 与 `style` 保持平铺缩进（`vueIndentScriptAndStyle: false`）。

## 导入规范

- 所有 import 放在文件顶部。
- 第三方库导入放在本地模块导入之前。
- 前端从 `src/` 导入时优先使用 `@/` 别名。
- 后端当前统一使用相对路径导入，除非任务明确要求，否则保持这一模式。
- 仅导入类型时优先使用 `import type`，尤其是前端 TypeScript 文件。
- 保持现有的具名导入风格，避免无必要的通配符导入。

## 命名规范

- 类名使用 `PascalCase`，例如 `SocketHandler`、`RoomManager`、`GobangGame`。
- 接口和类型使用 `PascalCase`，例如 `Player`、`Room`、`GameStatus`。
- 变量、函数、方法使用 `camelCase`，例如 `connectDB`、`joinRoom`、`requestDraw`。
- 真正常量使用 `UPPER_SNAKE_CASE`，例如 `BOARD_SIZE`；其余局部计算值保持 `camelCase`。
- Vue 路由名称当前使用 `PascalCase` 字符串，例如 `Lobby`、`Room`，除非任务要求重构，否则保持一致。

## 代码风格预期

- 优先编写小而聚焦的方法，对非法状态使用 early return。
- 保持现有直接、命令式的代码风格，不要引入过重的抽象层。
- 业务逻辑尽量放在 manager/service 中，不要散落到 socket 处理器或 Vue 模板里。
- 尽量复用现有数据结构，例如房间/玩家映射、已定义的 socket 事件类型。
- 除非逻辑确实不直观，否则不要额外添加注释。
- 非本地化任务下，保持用户可见文案与现有中文界面/服务端输出一致。

## Vue 前端约定

- 现有组件使用 `<script setup lang="ts">`，继续沿用这一写法。
- 优先使用项目中已存在的 Vue 模式：`ref`、`computed`、`watch`、`onMounted`、`onUnmounted`。
- 与 Socket 相关的状态型逻辑优先保留在 `frontend/src/services/socket.ts`，除非有充分理由拆分。
- 派生状态优先用计算属性表示，例如 `isPlayer`、`canStartGame`。
- 保持移动端适配能力，现有页面已经包含响应式布局与动态棋盘尺寸逻辑。
- 路由跳转与参数读取优先使用 Vue Router composables：`useRouter`、`useRoute`。

## 后端约定

- Koa 服务入口位于 `backend/src/index.ts`。
- WebSocket 编排逻辑应放在 `backend/src/socket/SocketHandler.ts`。
- 房间、对局、玩家相关行为应放在 `backend/src/game/` 下的 manager 或逻辑类中。
- 数据库连接与模型代码应放在 `backend/src/database/` 下。
- Socket 事件的载荷必须保持类型化，并与前端预期保持一致。

## 错误处理规范

- 对非法输入和不可能状态，优先遵循现有的 early return 模式。
- 对普通用户误操作，不要随意抛出新的通用异常；能安全忽略或通过事件反馈时优先采用现有流程。
- 对阻止后端启动的错误，应像 `connectDB()` 一样明确失败并快速退出。
- 新增异步后端逻辑时，要显式处理 Promise 拒绝，避免未处理的异步错误。
- 对房间 ID、座位索引、玩家身份、游戏状态切换等关键输入做显式校验。

## 数据与状态一致性

- 如果新增或修改 socket 事件，必须同时更新服务端和客户端类型定义。
- 如果修改会话或聊天的持久化数据结构，必须同步更新 Mongoose schema 与映射代码。
- 如果调整房间生命周期逻辑，应验证加入/离开/入座/起立/开始/落子/和局/结算等完整流程。
- 前后端存在重复的共享类型定义，修改时要确保语义保持同步一致。

## 需要避免的事项

- 不要手动编辑 `backend/dist/`。
- 不要仅仅为了风格偏好引入新依赖。
- 不要在未同步更新脚本和 Vite 代理配置的情况下悄悄修改端口。
- 不要在本文件里写出暗示“测试已存在”的命令说明，除非测试体系真实存在。
- 不要破坏现有的 session 恢复与 socket 重连流程。

## 推荐的代理工作流

- 修改前先阅读相关包的 `package.json`、共享类型文件，以及最近的 manager/service/component。
- 进行最小且完整的改动。
- 在受影响的包内执行 `npm run build` 做验证。
- 如果对 TypeScript 或 Vue 文件做了较明显修改，再执行 `npm run format`。
- 最终汇报时，如果验证仅限于构建，请明确说明项目当前没有自动化测试套件。
