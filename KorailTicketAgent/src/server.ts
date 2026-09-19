import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { searchKorailTickets, reserveKorailTickets } from './korail_engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3840;
const envPath = path.resolve('.env');
const uiPath = path.resolve(__dirname, '../src/ui');

app.use(cors());
app.use(express.json());
app.use(express.static(uiPath));

// GET Config
app.get('/api/config', (req, res) => {
  dotenv.config();
  res.json({
    korailId: process.env.KORAIL_MEMBERSHIP_NO || '',
    korailPw: process.env.KORAIL_PASSWORD || '',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.ALLOWED_CHAT_ID || '',
  });
});

// POST Save Config
app.post('/api/config', (req, res) => {
  const { korailId, korailPw, telegramToken, telegramChatId } = req.body;
  const envContent =
    `# Korail Credentials\n` +
    `KORAIL_MEMBERSHIP_NO=${korailId || ''}\n` +
    `KORAIL_PASSWORD=${korailPw || ''}\n\n` +
    `# Telegram Bot Credentials\n` +
    `TELEGRAM_BOT_TOKEN=${telegramToken || ''}\n` +
    `ALLOWED_CHAT_ID=${telegramChatId || ''}\n`;

  try {
    fs.writeFileSync(envPath, envContent, 'utf-8');
    dotenv.config();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Search Trains (v2 — korail_engine) - Returns results for Browser UI display
app.post('/api/search', async (req, res) => {
  const {
    departure, arrival, dateStr, timeStr,
    passengers, includeAdjacent, includeSeoulGroup,
    korailId, korailPw, telegramToken, telegramChatId,
  } = req.body;

  if (telegramToken)   process.env.TELEGRAM_BOT_TOKEN   = telegramToken;
  if (telegramChatId)  process.env.ALLOWED_CHAT_ID       = telegramChatId;
  if (korailId)        process.env.KORAIL_MEMBERSHIP_NO  = korailId;
  if (korailPw)        process.env.KORAIL_PASSWORD        = korailPw;

  try {
    const results = await searchKorailTickets({
      departure:              departure || '서울',
      arrival:                arrival   || '부산',
      dateStr,
      timeStr,
      passengers:             passengers || 1,
      includeAdjacentStation: includeAdjacent   || false,
      includeSeoulGroup:      includeSeoulGroup  || false,
    });
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Reserve Train (v2 — korail_engine) - Sends Telegram alert ONLY upon successful reservation!
app.post('/api/reserve', async (req, res) => {
  const {
    departure, arrival, dateStr, timeStr,
    passengers, includeAdjacent, includeSeoulGroup,
    korailId, korailPw, telegramToken, telegramChatId,
  } = req.body;

  if (telegramToken)   process.env.TELEGRAM_BOT_TOKEN   = telegramToken;
  if (telegramChatId)  process.env.ALLOWED_CHAT_ID       = telegramChatId;
  if (korailId)        process.env.KORAIL_MEMBERSHIP_NO  = korailId;
  if (korailPw)        process.env.KORAIL_PASSWORD        = korailPw;

  try {
    const reserveResult = await reserveKorailTickets({
      departure:              departure || '서울',
      arrival:                arrival   || '부산',
      dateStr,
      timeStr,
      passengers:             passengers || 1,
      includeAdjacentStation: includeAdjacent   || false,
      includeSeoulGroup:      includeSeoulGroup  || false,
    });
    res.json(reserveResult);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🖥️ KorailTicketAgent Server v2.0 — http://localhost:${PORT}`);
  console.log(`🚆 Engine: korail_engine.ts (korail.com React SPA)`);
  console.log(`==================================================`);
});
