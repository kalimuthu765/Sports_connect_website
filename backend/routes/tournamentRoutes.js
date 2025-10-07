import express from "express";
import auth from "../middleware/authMiddleware.js";
import Tournament from "../models/Tournament.js";
import Match from "../models/atch.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { name, sport } = req.body;
    const tournament = await Tournament.create({ name, sport, organizer: req.user.id });
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate("organizer", "name");
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("organizer", "name")
      .populate("teams.team", "name")
      .populate({
        path: "matches",
        populate: [{ path: "teams", select: "name" }, { path: "scorecard.team1.team scorecard.team2.team", select: "name" }]
      });
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/register", auth, async (req, res) => {
  try {
    if (req.user.role !== "team") return res.status(403).json({ message: "Only teams can register" });
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    const isRegistered = tournament.teams.some(t => String(t.team) === String(req.user.id));
    if (isRegistered) return res.status(400).json({ message: "Already registered" });
    tournament.teams.push({ team: req.user.id, status: "pending" });
    await tournament.save();
    res.json({ message: "Registration submitted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/registrations/:teamId", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (String(tournament.organizer) !== String(req.user.id)) return res.status(403).json({ message: "Not authorized" });
    const registration = tournament.teams.find(t => String(t.team) === String(req.params.teamId));
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    registration.status = status;
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/matches", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (String(tournament.organizer) !== String(req.user.id)) return res.status(403).json({ message: "Not authorized" });

    const { matchName, date, teams, location } = req.body;
    if (!teams || teams.length !== 2) return res.status(400).json({ message: "Two teams required" });

    const match = await Match.create({
      matchName, sport: tournament.sport, date, venue: location, teams, competition: tournament._id,
      scorecard: {
        team1: { team: teams[0], score: {}, playerStats: [] },
        team2: { team: teams[1], score: {}, playerStats: [] }
      }
    });

    tournament.matches.push(match._id);
    await tournament.save();

    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
