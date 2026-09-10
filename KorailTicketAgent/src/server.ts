import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { searchAndReserveKorail } from './korail_agent.js';

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

// POST Search Trains
app.post('/api/search', async (req, res) => {
  const { departure, arrival, dateStr, timeStr, korailId, korailPw, telegramToken, telegramChatId } = req.body;

  if (telegramToken) process.env.TELEGRAM_BOT_TOKEN = telegramToken;
  if (telegramChatId) process.env.ALLOWED_CHAT_ID = telegramChatId;
  if (korailId) process.env.KORAIL_MEMBERSHIP_NO = korailId;
  if (korailPw) process.env.KORAIL_PASSWORD = korailPw;

  try {
    await searchAndReserveKorail({
      departure: departure || '서울',
      arrival: arrival || '부산',
      dateStr,
      timeStr,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Reserve Train
app.post('/api/reserve', async (req, res) => {
  const { departure, arrival, dateStr, timeStr } = req.body;

  try {
    await searchAndReserveKorail({
      departure: departure || '서울',
      arrival: arrival || '부산',
      dateStr,
      timeStr,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🖥️ KorailTicketAgent Server Running at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
