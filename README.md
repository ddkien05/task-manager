# Phiếu Việc — Task Manager (Node.js + Express + MongoDB + Docker)

Ứng dụng quản lý công việc CRUD đơn giản, dùng cho bài tập lớn "Triển khai ứng dụng container trên cloud".

## Cấu trúc dự án

```
task-manager/
├── src/
│   ├── public/          # Giao diện (HTML/CSS/JS + Tailwind qua CDN)
│   │   ├── index.html
│   │   └── app.js
│   ├── models/
│   │   └── Task.js      # Mongoose schema
│   ├── routes/
│   │   └── tasks.js     # REST API CRUD
│   └── server.js        # Điểm khởi chạy Express
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── package.json
```

## Chạy local (không dùng Docker)

Yêu cầu: Node.js >= 18, MongoDB chạy sẵn ở `localhost:27017` (hoặc dùng MongoDB Atlas).

```bash
npm install
cp .env.example .env
npm run dev      # cần cài nodemon, hoặc dùng: npm start
```

Mở trình duyệt: http://localhost:3000

## Chạy bằng Docker Compose (khuyến nghị cho demo)

```bash
docker-compose up -d --build
```

- Web app: http://localhost (cổng 80 → container port 3000)
- MongoDB: cổng 27017, dữ liệu lưu ở Docker Volume `mongo-data`

Kiểm tra container đang chạy:
```bash
docker ps
docker stats          # đo CPU/RAM cho phần báo cáo hiệu năng
```

Kiểm thử tính bền vững dữ liệu (persistence):
```bash
docker-compose stop db
docker-compose start db
# → dữ liệu công việc vẫn còn nguyên nhờ volume mongo-data
```

Dừng và xoá container (giữ lại volume):
```bash
docker-compose down
```

## API endpoints

| Method | Endpoint                | Mô tả                              |
|--------|--------------------------|-------------------------------------|
| GET    | /api/tasks               | Lấy danh sách (lọc: priority, status, q) |
| GET    | /api/tasks/stats         | Thống kê tổng/đang làm/hoàn thành   |
| POST   | /api/tasks                | Tạo công việc mới                  |
| PUT    | /api/tasks/:id            | Cập nhật công việc                 |
| PATCH  | /api/tasks/:id/toggle     | Đánh dấu hoàn thành / chưa hoàn thành |
| DELETE | /api/tasks/:id            | Xóa công việc                      |

## Triển khai lên Cloud VM (AWS EC2 / Oracle Cloud)

```bash
# Trên VM Ubuntu, sau khi cài Docker + Docker Compose:
git clone <repo-url>
cd task-manager
docker-compose up -d --build
```

Nhớ mở port 80 (HTTP) và 22 (SSH) trong Security Group.
# DTDM-Nhom13
