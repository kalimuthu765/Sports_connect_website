import express from "express";
import auth from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import User from "../models/User.js";

const router = express.Router();

// Create a post
router.post("/", auth, async (req, res) => {
  try {
    const { caption, media } = req.body;
    const post = await Post.create({ user: req.user.id, caption, media });
    await User.findByIdAndUpdate(req.user.id, { $push: { posts: post._id } });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like a post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.likes.includes(req.user.id)) post.likes.push(req.user.id);
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const { text } = req.body;
    post.comments.push({ user: req.user.id, text });
    await post.save();
    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get feed (posts from all users)
router.get("/feed", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate("user");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
