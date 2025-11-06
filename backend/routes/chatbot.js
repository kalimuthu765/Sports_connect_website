// backend/routes/chatRoutes.js

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Router } from 'express';

dotenv.config();

// Use Router from express for module compatibility
const router = Router(); 

// 1. Initialize Gemini using the securely stored API key from .env
const apiKey = process.env.GEMINI_API_KEY; 

if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is not defined. Chatbot will be non-functional.");
}

// Initialize the AI client
const ai = new GoogleGenAI({ apiKey });

// Create a persistent chat session to maintain conversation context
// System instruction enforces the Sports Analyst persona and domain
const chat = ai.chats.create({
    model: "gemini-2.5-flash", 
    config: {
        systemInstruction: "You are the professional and highly knowledgeable Sports Analyst AI for the SportsConnect platform. Your role is STRICTLY limited to answering questions about sports, athletes, teams, matches, rules, and sports history. If the user asks about ANY non-sport topic (e.g., programming, cooking, music, general history), you MUST firmly and politely refuse, stating: 'I am the SportsConnect AI, and my domain is strictly sports. Please ask a question related to a sport, team, or athlete.'"
    }
});


// POST /api/chat/message - Endpoint to send a message to the AI
router.post('/message', async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "A valid 'message' string is required." });
    }
    
    if (!apiKey) {
        return res.status(503).json({ error: "AI Service Unavailable: API Key is missing on the server." });
    }

    try {
        // Send the user's message to the ongoing chat session
        const response = await chat.sendMessage({ message });

        // Send the AI's response back to the frontend
        res.json({ text: response.text });

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);
        res.status(500).json({ 
            error: "Failed to process the request via the Sports AI. Please check the backend server logs for the full error.",
        });
    }
});

export default router;