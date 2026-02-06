# 五子棋实时对战系统

使用 Vue 3 + TypeScript 作为前端，Koa 2 + TypeScript + Socket.IO 作为后端的 Web 五子棋实时对战系统。

## 功能特性

1. **无需登录** - 访问页面自动分配随机昵称
2. **游戏大厅** - 显示所有房间列表，房间以桌子形式展示
3. **房间系统** - 创建/加入房间，支持搜索房间号，支持观战和落座
4. **聊天功能** - 大厅和房间都支持实时聊天
5. **和局机制** - 支持发起和局，每局最多3次
6. **自动结算** - 游戏结束后10秒自动重置

## 技术栈

### 后端
- Koa 2
- TypeScript
- Socket.IO
- UUID

### 前端
- Vue 3 (Composition API)
- TypeScript
- Vue Router
- Socket.IO Client
- Canvas API

## 快速开始

### 1. 启动后端服务

```bash
cd backend
npm install
npm run dev
```

后端服务将运行在 http://localhost:3001

### 2. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将运行在 http://localhost:3000

### 3. 访问应用

打开浏览器访问 http://localhost:3000

## 游戏说明

- **黑子先行** - 黑方总是先手
- **和局请求** - 每局游戏每位玩家最多可发起3次和局请求
- **投降** - 游戏进行中可随时投降
- **观战** - 房间满员时可以观战，有空位时可加入游戏
- **结算** - 游戏结束后有10秒结算时间，之后自动重置

## 项目结构

```
.
├── backend/               # 后端代码
│   ├── src/
│   │   ├── game/         # 游戏逻辑
│   │   │   ├── GobangGame.ts
│   │   │   ├── RoomManager.ts
│   │   │   └── PlayerManager.ts
│   │   ├── socket/       # WebSocket处理
│   │   │   └── SocketHandler.ts
│   │   ├── types.ts      # 类型定义
│   │   └── index.ts      # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # 前端代码
│   ├── src/
│   │   ├── views/        # 页面组件
│   │   │   ├── Lobby.vue
│   │   │   └── Room.vue
│   │   ├── services/     # 服务
│   │   │   └── socket.ts
│   │   ├── router/       # 路由
│   │   ├── types.ts      # 类型定义
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

## 开发计划

- [x] 基础项目结构
- [x] 后端WebSocket服务
- [x] 前端Vue3项目
- [x] 游戏核心逻辑
- [x] 房间系统
- [x] 聊天功能
- [x] 和局机制
- [ ] 游戏音效
- [ ] 战绩统计
- [ ] 悔棋功能
- [ ] 观战模式优化

## License

MIT