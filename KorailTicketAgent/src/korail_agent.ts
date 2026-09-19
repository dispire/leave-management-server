import { searchKorailTickets } from './korail_engine.js';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.ALLOWED_CHAT_ID || '';
const bot = telegramToken ? new TelegramBot(telegramToken, { polling: false }) : null;

export interface TrainSearchOptions {
  departure: string;
  arrival: string;
  dateStr?: string; // YYYYMMDD
  timeStr?: string; // HH
  passengers?: number;
}

export async function searchAndReserveKorail(options: TrainSearchOptions) {
  const { departure = '서울', arrival = '부산', dateStr = '', timeStr = '08', passengers = 1 } = options;

  console.log(`==================================================`);
  console.log(`🚆 Korail Ticket Agent Starting...`);
  console.log(`📍 Departure: ${departure} -> Arrival: ${arrival}`);
  console.log(`==================================================\n`);

  try {
    const results = await searchKorailTickets({
      departure,
      arrival,
      dateStr,
      timeStr,
      passengers,
    });
    console.log(`✅ Train search completed successfully. Total ${results.length} trains found.`);
    return results;
  } catch (err: any) {
    console.error(`❌ Korail search error:`, err.message);
    if (bot && chatId) {
      await bot.sendMessage(chatId, `❌ *[코레일 예매 오류]* ${err.message}`);
    }
    throw err;
  }
}

// Direct execution test
if (process.argv[1]?.includes('korail_agent')) {
  searchAndReserveKorail({
    departure: process.argv[2] || '서울',
    arrival: process.argv[3] || '부산',
  });
}

