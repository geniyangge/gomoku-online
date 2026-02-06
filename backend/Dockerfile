FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 编译TypeScript
RUN npm run build

# 暴露端口
EXPOSE 8090

# 启动命令
CMD ["node", "dist/index.js"]