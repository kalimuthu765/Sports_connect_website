import express from "express";
import auth from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

// Get AI Recommendations (Simulated)
router.get("/recommendations", auth, async (req, res) => {
    try {
        const me = await User.findById(req.user.id);
        const recommendations = await User.find({
            sport: me.sport, 
            _id: { $ne: me._id, $nin: me.following } 
        }).limit(5); 
        res.json(recommendations);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// 1. GET CURRENT USER'S PROFILE ('/me')
// 1. GET CURRENT USER'S PROFILE ('/me')
// routes/userRoutes.js

// ... (existing imports and other routes)

// 1. GET CURRENT USER'S PROFILE ('/me')
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('posts')
      .populate('team', 'name')
      .populate('joinRequests.player', 'name'); // Add this line to populate player data
      
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ... (rest of the file remains the same)

// 2. GET USER PROFILE BY ID ('/:id')
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('posts')
      .populate('team', 'name');
      
    if (!user) {
      return res.status(404).json({ msg: 'Profile not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
});

// 3. UPDATE CURRENT USER'S PROFILE
// @route   PUT api/users/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', auth, async (req, res) => {
    try {
        const { name, bio, avatar, sport, cricketRole } = req.body;

        // Find the user by ID from the token
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update the user's fields
        user.name = name || user.name;
        user.bio = bio || user.bio;
        user.avatar = avatar || user.avatar;
        user.sport = sport || user.sport;
        user.cricketRole = cricketRole || user.cricketRole;

        await user.save();
        
        // Return the updated user data (without password)
        res.json({ message: 'Profile updated successfully', user });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// Get all players for a specific team
router.get("/:id/players", auth, async (req, res) => {
  try {
    const team = await User.findById(req.params.id).populate('roster', 'name role');
    if (!team || team.role !== 'team') {
        return res.status(404).json({ message: "Team not found" });
    }
    res.json(team.roster);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add player to roster (for teams)
router.post("/me/roster", auth, async (req, res) => {
    try {
        const team = await User.findById(req.user.id);
        if (team.role !== 'team') return res.status(403).json({ message: 'Only teams can manage rosters' });
        
        const player = await User.findOne({ email: req.body.email, role: 'player' });
        if (!player) return res.status(404).json({ message: 'Player not found or email is incorrect' });

        if (!team.roster.includes(player._id)) {
            team.roster.push(player._id);
            player.team = team._id;
            await team.save();
            await player.save();
        }
        await team.populate('roster');
        res.json(team);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Remove player from roster
router.delete("/me/roster/:playerId", auth, async (req, res) => {
    try {
        const team = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { roster: req.params.playerId } },
            { new: true }
        ).populate('roster');

        const player = await User.findById(req.params.playerId);
        if (player) {
            player.team = null;
            await player.save();
        }

        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add match stats
router.post("/me/stats", auth, async (req, res) => {
  try {
    const { matchDate, opponent, sport, stats } = req.body;
    const user = await User.findById(req.user.id);
    if (user.role !== "player") return res.status(403).json({ message: "Players only" });

    user.stats.push({ matchDate, opponent, sport, stats });
    await user.save();
    res.json({ message: "Stats saved", stats: user.stats });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Follow a user
router.post("/:id/follow", auth, async (req, res) => {
  try {
    if(req.user.id === req.params.id) return res.status(400).json({ message:"Cannot follow yourself" });
    const user = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);

    if(!user.followers.includes(req.user.id)){
      user.followers.push(req.user.id);
      me.following.push(user._id);
      await user.save();
      await me.save();
    }
    res.json({ message:"Followed successfully" });
  } catch(err){ res.status(500).json({ message:err.message }); }
});

// Get all teams for player to join
router.get("/teams/find", auth, async (req, res) => {
  try {
    const teams = await User.find({ role: 'team' });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Player sends a request to join a team
router.post("/join-team/:teamId", auth, async (req, res) => {
  try {
    const player = await User.findById(req.user.id);
    if (player.role !== 'player') return res.status(403).json({ message: "Only players can send join requests." });
    
    if (player.team) return res.status(400).json({ message: "You are already on a team." });

    const team = await User.findById(req.params.teamId);
    if (!team || team.role !== 'team') return res.status(404).json({ message: "Team not found." });

    // Check if request already exists
    const existingRequest = team.joinRequests.find(r => r.player.toString() === player._id.toString());
    if (existingRequest) {
        return res.status(400).json({ message: "Join request already sent." });
    }

    team.joinRequests.push({ player: player._id, status: 'pending' });
    await team.save();

    res.json({ message: "Join request sent successfully. Awaiting team approval." });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Team manager manages join requests
router.put("/manage-join-request/:requestId", auth, async (req, res) => {
  try {
    const team = await User.findById(req.user.id);
    if (team.role !== 'team') return res.status(403).json({ message: "Not authorized to manage requests." });

    const request = team.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });
    
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
    }

    request.status = status;
    await team.save();

    if (status === 'approved') {
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