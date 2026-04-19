// ============================================================
// File:        raceController.js
// Path:        server/src/controllers/raceController.js
// Project:     RaceArena
// Created:     2026-04-19
// Description: Handles HTTP requests for race creation, joining, and results
// ============================================================

exports.listRaces  = async (req, res) => { res.json([]); };
exports.createRace = async (req, res) => { res.status(201).json({}); };
exports.getRace    = async (req, res) => { res.json({}); };
exports.finishRace = async (req, res) => { res.json({}); };
