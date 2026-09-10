# 📋 Task Manager

Ứng dụng quản lý công việc được xây dựng bằng **Node.js, Express.js và MongoDB**, sau đó được đóng gói bằng **Docker** và triển khai trên **AWS EC2**.

## 🛠️ Công nghệ

* Node.js 18
* Express.js
* MongoDB 6.0
* Mongoose
* Docker
* Docker Compose
* Docker Volume
* AWS EC2

## 📁 Cấu trúc chính

```text
task-manager/
├── src/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
└── README.md
```

## 🔌 REST API

| Method | Endpoint                | Chức năng           |
| ------ | ----------------------- | ------------------- |
| GET    | `/api/tasks`            | Lấy danh sách Task  |
| GET    | `/api/tasks/stats`      | Lấy thống kê        |
| POST   | `/api/tasks`            | Tạo Task            |
| PUT    | `/api/tasks/:id`        | Cập nhật Task       |
| PATCH  | `/api/tasks/:id/toggle` | Đổi trạng thái Task |
| DELETE | `/api/tasks/:id`        | Xóa Task            |

## 🐳 Docker

### Dockerfile

Dockerfile sử dụng Node.js 18 Alpine để đóng gói ứng dụng:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
```

### Docker Compose

Hệ thống gồm 2 container:

* `task-manager-web`: chạy ứng dụng Node.js.
* `task-manager-db`: chạy MongoDB 6.0.

Web sử dụng port `80` và kết nối MongoDB:

```text
mongodb://db:27017/taskdb
```

MongoDB sử dụng Docker Volume:

```text
mongo-data:/data/db
```

giúp dữ liệu không bị mất khi container được restart.

## 🚀 Chạy ứng dụng

```bash
docker compose up -d --build
```

Kiểm tra:

```bash
docker ps
```

Truy cập:

```text
http://localhost
```

## ☁️ AWS EC2

Ứng dụng được triển khai trên **AWS EC2** bằng Docker Compose.

```text
Dockerfile
    ↓
Docker Image
    ↓
Docker Compose
    ↓
AWS EC2
    ↓
Public IP
    ↓
Task Manager Web
```

## 🧪 Demo

1. `docker images`
2. `docker ps`
3. Truy cập Public IP
4. Tạo Task
5. Restart MongoDB
6. Refresh và kiểm tra dữ liệu
7. `docker stats`

## 📌 Repository

GitHub: https://github.com/ddkien05/task-manager
