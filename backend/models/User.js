import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["player", "team", "organizer"], required: true },
  sport: String,
  cricketRole: {
    type: String,
    enum: ["Batter", "Bowler", "All-rounder", "Wicket-keeper"],
    required: function() { return this.sport === 'Cricket'; }
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  bio: String,
  avatar: String,
  stats: [
    {
      matchDate: Date,
      opponent: String,
      sport: String,
      stats: mongoose.Schema.Types.Mixed
    }
  ],
  roster: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  joinRequests: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
  }],
  achievements: [String],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
