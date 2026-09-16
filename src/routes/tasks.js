const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { authMiddleware } = require("../middleware/auth");

// Toàn bộ route bên dưới đều yêu cầu đã đăng nhập
router.use(authMiddleware);

/**
 * GET /api/tasks
 * Query params: priority=low|medium|high, status=todo|done, q=<search text>
 * Chỉ trả về công việc thuộc về người dùng đang đăng nhập
 */
router.get("/", async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (
      req.query.priority &&
      ["low", "medium", "high"].includes(req.query.priority)
    ) {
      filter.priority = req.query.priority;
    }
    if (req.query.status === "done") filter.completed = true;
    if (req.query.status === "todo") filter.completed = false;
    if (req.query.q) {
      filter.title = { $regex: req.query.q, $options: "i" };
    }

    const tasks = await Task.find(filter).sort({ completed: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats - thống kê nhanh cho dashboard (chỉ tính của user hiện tại)
router.get("/stats", async (req, res) => {
  try {
    const uid = req.userId;
    const [total, done, high] = await Promise.all([
      Task.countDocuments({ userId: uid }),
      Task.countDocuments({ userId: uid, completed: true }),
      Task.countDocuments({ userId: uid, priority: "high", completed: false }),
    ]);
    res.json({ total, done, todo: total - done, highPending: high });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;
    const task = await Task.create({
      userId: req.userId,
      title,
      description,
      priority,
      dueDate,
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!task)
      return res.status(404).json({ error: "Không tìm thấy công việc" });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/toggle - đánh dấu hoàn thành / chưa hoàn thành
router.patch("/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task)
      return res.status(404).json({ error: "Không tìm thấy công việc" });
    task.completed = !task.completed;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!task)
      return res.status(404).json({ error: "Không tìm thấy công việc" });
    res.json({ message: "Đã xóa công việc" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
