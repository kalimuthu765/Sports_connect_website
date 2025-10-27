import mongoose from "mongoose";

const roleOptions = {
  Cricket: ["Batter", "Bowler", "All-rounder", "Wicket-keeper"],
  Football: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  Volleyball: ["Setter", "Libero", "Outside Hitter", "Middle Blocker", "Opposite Hitter"],
  Hockey: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Badminton: ["Singles", "Doubles", "Mixed Doubles"],
  Tennis: ["Singles", "Doubles"],
  Kabaddi: ["Raider", "Defender", "All-rounder"],
  Baseball: ["Pitcher", "Catcher", "Infielder", "Outfielder"],
  Athletics: ["Sprinter", "Long-distance", "Thrower", "Jumper"],
};

const userSchema = new mongoose.Schema({
  /* 🧩 Basic Info */
  name: { type: String, required: true },
  fname: String,
  lname: String,
  gender: String,
  age: Number,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["player", "team", "organizer"], required: true },
  sport: { type: String, enum: Object.keys(roleOptions), required: true },

  /* 🎯 Dynamic Role by Sport */
  sportRole: {
    type: String,
    validate: {
      validator: function (value) {
        if (!this.sport) return true;
        const roles = roleOptions[this.sport] || [];
        return roles.includes(value);
      },
      message: (props) => `${props.value} is not a valid role for the selected sport.`,
    },
  },

  /* 🌍 Location & Profile */
  country: String,
  state: String,
  district: String,
  team: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  bio: String,
  avatar: String,

  /* 📊 Stats & Records */
  matchStats: [
    {
      matchDate: Date,
      opponent: String,
      sport: String,
      stats: mongoose.Schema.Types.Mixed,
    },
  ],
  overallStats: mongoose.Schema.Types.Mixed,

  /* 👥 Relationships */
  roster: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  joinRequests: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  achievements: [String],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
