import { chromium } from 'playwright';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

export interface TrainSchedule {
  id: number;
  trainName: string;
  line: string;
  seoulDep?: string;
  cheongnyangniDep: string;
  yangpyeongArr: string;
  duration: string;
}

export const YANGPYEONG_TRAINS: TrainSchedule[] = [
  { id: 1, trainName: 'KTX-이음 817', line: '강릉선', cheongnyangniDep: '16:15', yangpyeongArr: '16:41', duration: '26분' },
  { id: 2, trainName: 'KTX-이음 715', line: '중앙선', seoulDep: '16:30', cheongnyangniDep: '16:51', yangpyeongArr: '17:17', duration: '26분' },
  { id: 3, trainName: '무궁화호 1603', line: '중앙선', cheongnyangniDep: '16:45', yangpyeongArr: '17:21', duration: '36분' },
  { id: 4, trainName: 'KTX-이음 819', line: '강릉선', seoulDep: '17:00', cheongnyangniDep: '17:21', yangpyeongArr: '17:47', duration: '26분' },
  { id: 5, trainName: 'ITX-마음 1181', line: '중앙선', cheongnyangniDep: '17:35', yangpyeongArr: '18:07', duration: '32분' },
  { id: 6, trainName: 'KTX-이음 821', line: '강릉선', seoulDep: '18:00', cheongnyangniDep: '18:22', yangpyeongArr: '18:48', duration: '26분' },
  { id: 7, trainName: '무궁화호 1605', line: '중앙선', cheongnyangniDep: '19:10', yangpyeongArr: '19:47', duration: '37분' },
  { id: 8, trainName: 'KTX-이음 825', line: '강릉선', seoulDep: '20:00', cheongnyangniDep: '20:21', yangpyeongArr: '20:47', duration: '26분' }
];

export async function openKorailWithTrain(trainId: number) {
  const train = YANGPYEONG_TRAINS.find(t => t.id === trainId);
  if (!train) {
    console.error(`Train ID ${trainId} not found`);
    return;
  }

  console.log('==================================================');
  console.log(`🚆 [코레일 예매 시도] ${train.trainName} (${train.line})`);
  console.log(`📍 출발: ${train.seoulDep ? `서울 ${train.seoulDep} / ` : ''}청량리 ${train.cheongnyangniDep} ➔ 양평 ${train.yangpyeongArr}`);
  console.log(`📅 일시: 2026년 9월 12일(토)`);
  console.log('==================================================\n');

  const tempProfileDir = path.join(os.tmpdir(), 'edge_korail_user_profile');
  const targetUrl = 'https://www.korail.com/ticket/main';

  exec(`start msedge "${targetUrl}" --user-data-dir="${tempProfileDir}" --no-first-run --no-default-browser-check`);
}

if (process.argv[1]?.includes('reserve_train_option')) {
  const targetId = parseInt(process.argv[2] || '2', 10);
  openKorailWithTrain(targetId);
}
