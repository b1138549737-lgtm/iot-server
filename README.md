# iot-server

IoT 设备控制后端服务。

## 技术栈

- **运行环境**: Node.js + Express
- **数据库**: MongoDB + Mongoose
- **消息队列**: EMQX (MQTT Broker)
- **认证**: JWT (微信登录)

## 快速开始

\\\ash
npm install
npm run build
npm start
\\\

## 环境变量

参考 \.env\ 文件配置 MongoDB、MQTT、微信 AppID/Secret。

## 项目结构

\\\
src/
├── app.ts                 # 入口
├── config/                # 数据库、MQTT 配置
├── controllers/           # 路由处理器
├── middlewares/            # JWT 认证、错误处理
├── models/                # Mongoose 模型
├── routes/                # 路由定义
├── services/              # MQTT 消息分发、定时调度
└── utils/                 # 日志、响应格式
\\\

## API

| 路由 | 说明 |
|---|---|
| \/api/auth\ | 微信登录、用户信息 |
| \/api/devices\ | 设备 CRUD、控制 |
| \/api/sensors\ | 传感器数据查询 |
| \/api/schedules\ | 定时任务管理 |
| \/health\ | 健康检查 |

