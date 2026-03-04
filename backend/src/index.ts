import Koa from 'koa';
import http from 'http';
import 'dotenv/config';
import { SocketHandler } from './socket/SocketHandler';
import { connectDB } from './database/db';

const app = new Koa();

const server = http.createServer(app.callback());

async function start() {
  await connectDB();
  new SocketHandler(server);
  
  const PORT = process.env.PORT || 8090;
  
  server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}

start();