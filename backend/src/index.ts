import Koa from 'koa';
import http from 'http';
import { SocketHandler } from './socket/SocketHandler';

const app = new Koa();
const server = http.createServer(app.callback());

// WebSocket处理
new SocketHandler(server);

const PORT = process.env.PORT || 8090;

server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});