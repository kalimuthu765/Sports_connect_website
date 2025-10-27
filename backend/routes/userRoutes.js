import express from "express";
import auth from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

/* -----------------------------------------------------
   🔹 REGISTER (Sign Up)
----------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const {
      role,
      email,
      password,
      fname,
      lname,
      name,
      sport,
      gender,
      age,
      team,
      country,
      state,
      district,
      bio,
      avatar,
      cricketRole,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      role,
      email,
      password: hashedPassword,
      name: role === "player" ? `${fname} ${lname}` : name,
      fname,
      lname,
      sport,
      gender,
      age,
      team,
      country,
      state,
      district,
      bio,
      avatar,
      cricketRole,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "User registered successfully",
      token,
      userId: user._id,
      role: user.role,
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});


/* -----------------------------------------------------
   🔹 LOGIN (Sign In)
----------------------------------------------------- */
/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Please provide email and password" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Sign JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 AI Recommendations (Simulated)
----------------------------------------------------- */
router.get("/recommendations", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const recommendations = await User.find({
      sport: me.sport,
      _id: { $ne: me._id, $nin: me.following },
    }).limit(5);
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 GET CURRENT USER PROFILE (/me)
----------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("posts")
      .populate("team", "name")
      .populate("joinRequests.player", "name");

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/* -----------------------------------------------------
   🔹 GET USER PROFILE BY ID (/:id)
----------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("posts")
      .populate("team", "name");

    if (!user) return res.status(404).json({ msg: "Profile not found" });

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

/* -----------------------------------------------------
   🔹 UPDATE CURRENT USER PROFILE (PUT /me)
----------------------------------------------------- */
router.put("/me", auth, async (req, res) => {
  try {
    const { name, bio, avatar, sport, cricketRole } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    user.name = name || user.name;
    user.bio = bio || user.bio;
    user.avatar = avatar || user.avatar;
    user.sport = sport || user.sport;
    user.cricketRole = cricketRole || user.cricketRole;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/* -----------------------------------------------------
   🔹 GET ALL PLAYERS FOR A TEAM
----------------------------------------------------- */
router.get("/:id/players", auth, async (req, res) => {
  try {
    const team = await User.findById(req.params.id).populate(
      "roster",
      "name role"
    );
    if (!team || team.role !== "team") {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team.roster);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 ADD PLAYER TO TEAM ROSTER (FOR TEAMS)
----------------------------------------------------- */
router.post("/me/roster", auth, async (req, res) => {
  try {
    const team = await User.findById(req.user.id);
    if (team.role !== "team")
      return res.status(403).json({ message: "Only teams can manage rosters" });

    const player = await User.findOne({ email: req.body.email, role: "player" });
    if (!player)
      return res
        .status(404)
        .json({ message: "Player not found or email is incorrect" });

    if (!team.roster.includes(player._id)) {
      team.roster.push(player._id);
      player.team = team._id;
      await team.save();
      await player.save();
    }

    await team.populate("roster");
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------------------------
   🔹 REMOVE PLAYER FROM TEAM ROSTER
----------------------------------------------------- */
router.delete("/me/roster/:playerId", auth, async (req, res) => {
  try {
    const team = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { roster: req.params.playerId } },
      { new: true }
    ).populate("roster");

    const player = await User.findById(req.params.playerId);
    if (player) {
      player.team = null;
      await player.save();
    }

    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------------------------
   🔹 ADD MATCH STATS + UPDATE OVERALL STATS
----------------------------------------------------- */
router.post("/me/stats", auth, async (req, res) => {
  try {
    const { matchDate, opponent, sport, stats } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "player")
      return res.status(403).json({ message: "Only players can add stats" });

    // Save match stats
    user.matchStats.push({ matchDate, opponent, sport, stats });

    // Update overall stats dynamically
    user.overallStats = user.overallStats || {};
    for (const [key, value] of Object.entries(stats || {})) {
      if (typeof value === "number") {
        user.overallStats[key] = (user.overallStats[key] || 0) + value;
      }
    }

    await user.save();
    res.json({
      message: "✅ Match stats added successfully",
      matchStats: user.matchStats,
      overallStats: user.overallStats,
    });
  } catch (err) {
    console.error("Error saving stats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 FOLLOW USER
----------------------------------------------------- */
router.post("/:id/follow", auth, async (req, res) => {
  try {
    if (req.user.id === req.params.id)
      return res.status(400).json({ message: "Cannot follow yourself" });

    const user = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);

    if (!user.followers.includes(req.user.id)) {
      user.followers.push(req.user.id);
      me.following.push(user._id);
      await user.save();
      await me.save();
    }

    res.json({ message: "Followed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------------------------
   🔹 GET ALL TEAMS FOR PLAYER TO JOIN
----------------------------------------------------- */
router.get("/teams/find", auth, async (req, res) => {
  try {
    const teams = await User.find({ role: "team" });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------------------------
   🔹 PLAYER SENDS JOIN REQUEST TO TEAM
----------------------------------------------------- */
router.post("/join-team/:teamId", auth, async (req, res) => {
  try {
    const player = await User.findById(req.user.id);
    if (player.role !== "player")
      return res
        .status(403)
        .json({ message: "Only players can send join requests." });

    if (player.team)
      return res
        .status(400)
        .json({ message: "You are already on a team." });

    const team = await User.findById(req.params.teamId);
    if (!team || team.role !== "team")
      return res.status(404).json({ message: "Team not found." });

    const existingRequest = team.joinRequests.find(
      (r) => r.player.toString() === player._id.toString()
    );
    if (existingRequest)
      return res.status(400).json({ message: "Join request already sent." });

    team.joinRequests.push({ player: player._id, status: "pending" });
    await team.save();

    res.json({
      message: "Join request sent successfully. Awaiting team approval.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------------------------
   🔹 TEAM MANAGER MANAGES JOIN REQUESTS
----------------------------------------------------- */
router.put("/manage-join-request/:requestId", auth, async (req, res) => {
  try {
    const team = await User.findById(req.user.id);
    if (team.role !== "team")
      return res
        .status(403)
        .json({ message: "Not authorized to manage requests." });

    const request = team.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });

    const { status } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status." });

    request.status = status;
    await team.save();

    if (status === "approved") {
      const player = await User.findById(request.player);
      if (player) {
        player.team = team._id;
        await player.save();
        team.roster.push(player._id);
        await team.save();
      }
    }

    res.json({ message: `Request ${status}.`, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
