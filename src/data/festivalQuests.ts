import type { PlayerSlot } from '../types';

export interface FestivalPuzzle {
  question: string;
  choices: readonly string[];
  answer: number;
  hint: string;
}

export interface QuestStation {
  actor: number;
  name: string;
  landmark: string;
  x: number;
  z: number;
  puzzles: readonly FestivalPuzzle[];
}

export const QUEST_REWARD = 45;
export const QUEST_INTERVAL = 10;

export const QUEST_STATIONS: Record<PlayerSlot, readonly QuestStation[]> = {
  1: [
    {
      actor: 0, name: 'พี่โคม', landmark: 'ทางเดินฝั่งร้านกระทง', x: -2.9, z: 3.3,
      puzzles: [
        { question: 'ป้ายโคมเรียงเลข 3, 6, 11, 18, 27 ช่องถัดไปควรเป็นเลขอะไร?',
          choices: ['36', '37', '38', '40'], answer: 2, hint: 'ผลต่างเพิ่มทีละ 2 จาก 3 ไป 5, 7 และ 9' },
        { question: 'โคมแขวนซ้ำตามลำดับ แดง–ทอง–ทอง–ฟ้า โคมดวงที่ 19 เป็นสีอะไร?',
          choices: ['สีแดง', 'สีทอง', 'สีฟ้า', 'สีเขียว'], answer: 1, hint: 'นับทีละชุดละ 4 ดวง แล้วดูว่าดวงที่ 19 อยู่ตำแหน่งใดในชุด' }
      ]
    },
    {
      actor: 2, name: 'ลุงชาญ', landmark: 'ลานด้านนอกฝั่งร้านขนม', x: -13, z: 1.8,
      puzzles: [
        { question: 'แพรเข้าแถวหน้าก้อง มะลิอยู่หลังแพรแต่หน้าก้อง และป่านอยู่หลังทุกคน ใครยืนคนที่สอง?',
          choices: ['แพร', 'ก้อง', 'มะลิ', 'ป่าน'], answer: 2, hint: 'ถ้าเรียงแพร มะลิ และก้องได้ ป่านจะอยู่ท้ายแถวเสมอ' },
        { question: 'มีเหรียญ 1, 2 และ 5 บาทอย่างละพอใช้ ต้องจ่ายพอดี 8 บาท ใช้อย่างน้อยกี่เหรียญ?',
          choices: ['2 เหรียญ', '3 เหรียญ', '4 เหรียญ', '5 เหรียญ'], answer: 1, hint: 'ลองใช้เหรียญ 5 บาทหนึ่งเหรียญ แล้วคิดวิธีจ่ายส่วนที่เหลือให้พอดี' }
      ]
    },
    {
      actor: 5, name: 'น้องดาว', landmark: 'ลานด้านหน้าพระอุโบสถ', x: -4.6, z: -7.3,
      puzzles: [
        { question: 'ถ้าวันมะรืนคือวันศุกร์ สองวันก่อนเป็นวันอะไร?',
          choices: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ'], answer: 1, hint: 'หาว่าวันนี้เป็นวันอะไรก่อน แล้วค่อยถอยหลังอีกสองวัน' },
        { question: 'กล่องสามใบเขียนว่า แดง / ฟ้า / คละ ป้ายผิดทุกใบ ควรหยิบจากกล่องป้ายใดเพื่อรู้สีของทั้งสามกล่องจากการหยิบครั้งเดียว?',
          choices: ['ป้ายแดง', 'ป้ายฟ้า', 'ป้ายคละ', 'กล่องไหนก็ได้'], answer: 2, hint: 'กล่องที่เขียนว่าคละมีสีเดียวแน่นอน เพราะป้ายทุกใบผิด' }
      ]
    }
  ],
  2: [
    {
      actor: 1, name: 'ยายมะลิ', landmark: 'ทางเดินฝั่งร้านเสี่ยงทาย', x: 2.9, z: 3.3,
      puzzles: [
        { question: 'แจกขนมให้เด็ก 4 คนเท่า ๆ กันแล้วเหลือ 3 ชิ้น ถ้าแจกคนละ 5 ชิ้น ตอนแรกมีขนมกี่ชิ้น?',
          choices: ['17', '20', '23', '27'], answer: 2, hint: 'นับขนมที่แจกไปก่อน แล้วบวกขนมที่ยังเหลือ' },
        { question: 'ออกจากบ้านเวลา 17:45 เดิน 35 นาที แวะซื้อขนม 15 นาที จะถึงงานวัดกี่โมง?',
          choices: ['18:20', '18:25', '18:30', '18:35'], answer: 3, hint: 'รวมเวลาเดินและเวลาแวะเป็น 50 นาที' }
      ]
    },
    {
      actor: 6, name: 'พี่แก้ว', landmark: 'ทางเดินไปชิงช้าสวรรค์', x: 10.9, z: -7.2,
      puzzles: [
        { question: 'ไฟงานวัดกะพริบทุก 6 วินาที อีกดวงทุก 8 วินาที ถ้ากะพริบพร้อมกันตอนนี้ จะพร้อมกันอีกครั้งเมื่อผ่านไปกี่วินาที?',
          choices: ['12 วินาที', '14 วินาที', '24 วินาที', '48 วินาที'], answer: 2, hint: 'หาเลขแรกที่ทั้ง 6 และ 8 หารลงตัว' },
        { question: 'ราคาบัตรมีเลขสองหลัก ผลรวมเลขทั้งสองคือ 9 และหลักสิบมากกว่าหลักหน่วย 3 บัตรราคาเท่าไร?',
          choices: ['36 บาท', '45 บาท', '54 บาท', '63 บาท'], answer: 3, hint: 'ลองเทียบหลักสิบกับหลักหน่วยของแต่ละตัวเลือก' }
      ]
    },
    {
      actor: 10, name: 'พี่ขิม', landmark: 'ลานด้านนอกฝั่งร้านน้ำ', x: 13, z: 1.8,
      puzzles: [
        { question: 'มะลิอยู่ซ้ายของแก้ว ดาวอยู่ขวาของแก้ว และขิมอยู่ระหว่างแก้วกับดาว ใครอยู่คนที่สามจากซ้าย?',
          choices: ['มะลิ', 'แก้ว', 'ขิม', 'ดาว'], answer: 2, hint: 'วางแก้วไว้ก่อน แล้วเรียงคนอื่นจากตำแหน่งของแก้ว' },
        { question: 'ตักน้ำครึ่งเหยือกออกไป แล้วเติมกลับมา 3 ถ้วย ตอนนี้มีน้ำเท่าเดิม เหยือกเดิมมีน้ำกี่ถ้วย?',
          choices: ['3 ถ้วย', '5 ถ้วย', '6 ถ้วย', '9 ถ้วย'], answer: 2, hint: 'น้ำที่เติมกลับมามีปริมาณเท่ากับครึ่งหนึ่งของน้ำเดิม' }
      ]
    }
  ]
};

function makeRandomDraw<T>(pool: readonly T[]): () => T {
  let remaining: T[] = [];
  let previous: T | undefined;
  return () => {
    if (!remaining.length) remaining = [...pool];
    const eligible = remaining.length > 1 ? remaining.filter(item => item !== previous) : remaining;
    const item = eligible[Math.floor(Math.random() * eligible.length)];
    remaining.splice(remaining.indexOf(item), 1);
    previous = item;
    return item;
  };
}

export interface FestivalQuest {
  station: QuestStation;
  puzzle: FestivalPuzzle;
}

export function makeFestivalQuestDraw(slot: PlayerSlot): () => FestivalQuest {
  const stations = QUEST_STATIONS[slot];
  const drawStation = makeRandomDraw(stations);
  const drawPuzzle = makeRandomDraw(stations.flatMap(station => station.puzzles));
  return () => ({ station: drawStation(), puzzle: drawPuzzle() });
}
