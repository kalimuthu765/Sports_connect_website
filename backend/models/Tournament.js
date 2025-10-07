import mongoose from "mongoose";

// Sub-schema for a player's individual stats in a match
const playerMatchStatsSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stats: mongoose.Schema.Types.Mixed // e.g., { runs: 50, wickets: 2 } or { goals: 2, assists: 1 }
});

// Sub-schema for a team's performance in a match
const teamPerformanceSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: String, // e.g., "200/5" or "3"
    playerStats: [playerMatchStatsSchema] // Array of detailed player stats for this team
});

// The main match schema, updated to hold structured scorecard data
const matchSchema = new mongoose.Schema({
    matchName: String,
    date: Date,
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    location: String,
    scorecard: { // This will hold the detailed scorecard
        team1: teamPerformanceSchema,
        team2: teamPerformanceSchema,
    },
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' }
});

// Main tournament schema
const tournamentSchema = new mongoose.Schema({
    name: String,
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sport: String,
    teams: [{
        team: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    }],
    matches: [matchSchema],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Tournament", tournamentSchema);