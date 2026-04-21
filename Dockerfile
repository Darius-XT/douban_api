FROM --platform=linux/amd64 node:20-bullseye

# 切换为阿里云 Debian apt 镜像源，避免国内 TLS 连接问题
RUN sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list \
 && sed -i 's|http://security.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list

# 安装 Chromium 及其运行时依赖
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8085

CMD ["npm", "run", "build"]
