import {
  AccessoryId,
  CharacterConfig,
  FortuneDef,
  GenderId,
  GlassesId,
  HairStyleId,
  HatId,
  KrathongDef,
  OutfitStyleId,
  ShopItemDef
} from '../types';

export const KRATHONG_CATALOG: KrathongDef[] = [
  {
    id: 'banana_lotus',
    name: 'กระทงใบตองดอกบัว',
    subtitle: 'คลาสสิกกลีบใบตอง',
    icon: '🪷',
    price: 50,
    themeColor: '#ff9ec6',
    description: 'ใบตองจีบประณีต ประดับดอกบัวชมพูและดาวเรือง พร้อมธูปเทียน'
  },
  {
    id: 'bread_turtle',
    name: 'กระทงขนมปังน้องเต่า',
    subtitle: 'รักษ์โลกน้องปลากินได้',
    icon: '🐢',
    price: 60,
    themeColor: '#f4b860',
    description: 'ขนมปังอบหอมปั้นรูปเต่าน้อยน่ารัก กระดองลายตาราง พร้อมเทียนหอม'
  },
  {
    id: 'golden_marigold',
    name: 'กระทงดอกดาวเรืองทอง',
    subtitle: 'สิริมงคลสว่างไสว',
    icon: '🌼',
    price: 70,
    themeColor: '#ffd15c',
    description: 'กลีบทองอร่าม ดอกดาวเรืองฟูนุ่ม และพวงมาลัยมะลิหอม'
  },
  {
    id: 'sweetheart_couple',
    name: 'กระทงหัวใจคู่รัก',
    subtitle: 'เทียนคู่แทนใจสองเรา',
    icon: '💖',
    price: 90,
    themeColor: '#ff7aa8',
    description: 'ฐานรูปหัวใจกลีบกุหลาบชมพู ปักเทียนคู่รักส่องแสงเคียงกัน'
  },
  {
    id: 'coconut_orchid',
    name: 'กระทงกะลากล้วยไม้',
    subtitle: 'วิถีไทยริมน้ำแสนอบอุ่น',
    icon: '🌺',
    price: 80,
    themeColor: '#c98eff',
    description: 'กะลามะพร้าวขัดเงา ใบเตยหอม และช่อกล้วยไม้ม่วงพราว'
  },
  {
    id: 'crystal_lotus',
    name: 'กระทงโคมบัวแก้ว',
    subtitle: 'เรืองแสงดุจแสงจันทร์',
    icon: '✨',
    price: 120,
    themeColor: '#8be9ff',
    description: 'ดอกบัวแก้วโปร่งแสงสีฟ้าพาสเทล ประกายแสงละมุนกลางสายน้ำ'
  }
];

export const SNACK_CATALOG: ShopItemDef[] = [
  {
    id: 'khanom_krok',
    category: 'snack',
    name: 'ขนมครกหน้ากะทิ',
    subtitle: 'ร้อนๆ หอมมันโรยต้นหอม',
    icon: '🥥',
    price: 25,
    color: '#fff3d6',
    secondaryColor: '#f2b857',
    reaction: 'หอมกะทิอุ่นๆ อร่อยมาก~'
  },
  {
    id: 'cotton_candy',
    category: 'snack',
    name: 'สายไหมพาสเทล',
    subtitle: 'นุ่มฟูสีหวานละลายในปาก',
    icon: '🍭',
    price: 20,
    color: '#ffb7d5',
    secondaryColor: '#a6e4ff',
    reaction: 'หวานนุ่มละลายในปากเลย~'
  },
  {
    id: 'meatball_skewer',
    category: 'snack',
    name: 'ลูกชิ้นปิ้งน้ำจิ้มเด็ด',
    subtitle: 'ไม้ใหญ่หอมเตาถ่าน',
    icon: '🍡',
    price: 30,
    color: '#e5a97c',
    secondaryColor: '#d9483b',
    reaction: 'อื้อหือ น้ำจิ้มเด็ดมาก!'
  },
  {
    id: 'thong_yod',
    category: 'snack',
    name: 'ขนมทองหยอดชาววัง',
    subtitle: 'สีทองอร่ามหวานละมุน',
    icon: '🍮',
    price: 35,
    color: '#ffb82e',
    secondaryColor: '#a4d98c',
    reaction: 'หวานฉ่ำ เฮงๆ รับคืนวันเพ็ญ!'
  }
];

export const DRINK_CATALOG: ShopItemDef[] = [
  {
    id: 'thai_tea',
    category: 'drink',
    name: 'ชาไทยเย็นเข้มข้น',
    subtitle: 'หอมชาโบราณ ราดนมสด',
    icon: '🧋',
    price: 35,
    color: '#e87424',
    secondaryColor: '#fff5e4',
    reaction: 'ชาไทยหอมมัน ชื่นใจสุดๆ!'
  },
  {
    id: 'pink_milk',
    category: 'drink',
    name: 'นมเย็นชมพูหวานใจ',
    subtitle: 'สีชมพูพาสเทลน่ารัก',
    icon: '🍓',
    price: 30,
    color: '#ff9ec4',
    secondaryColor: '#fff0f6',
    reaction: 'หวานละมุนเหมือนคนข้างๆ เลย~'
  },
  {
    id: 'chrysanthemum',
    category: 'drink',
    name: 'น้ำเก๊กฮวยเย็นเจี๊ยบ',
    subtitle: 'หอมดอกเก๊กฮวยสดชื่น',
    icon: '🌼',
    price: 20,
    color: '#f7d560',
    secondaryColor: '#fffbe6',
    reaction: 'เย็นชื่นใจ เดินเที่ยวต่อได้ยาวๆ!'
  },
  {
    id: 'butterfly_pea',
    category: 'drink',
    name: 'อัญชันมะนาวโซดา',
    subtitle: 'ม่วงอมชมพูซาบซ่า',
    icon: '🫐',
    price: 35,
    color: '#9c7aff',
    secondaryColor: '#f39ef7',
    reaction: 'ซ่าสดชื่น เปรี้ยวหวานกำลังดี!'
  }
];

export const FORTUNE_CATALOG: FortuneDef[] = [
  {
    number: 1,
    title: 'ใบที่ ๑ — ดวงจันทร์เคียงดาว',
    poem: 'คืนเพ็ญแสงนวลผ่องสองดวงใจ เดินเคียงกันไปไม่มีหวั่นไหว สิ่งที่หวังไว้จะสมปรารถนาในเร็ววัน',
    luckLevel: 'ดีเลิศ 💖'
  },
  {
    number: 3,
    title: 'ใบที่ ๓ — สายน้ำพาโชค',
    poem: 'ปล่อยทุกข์โศกลงลำน้ำใสสะอาด พัดพาสิ่งดีๆ เข้ามาไม่ขาดสาย การงานการเงินคล่องตัวดั่งสายน้ำ',
    luckLevel: 'เฮงมาก ✨'
  },
  {
    number: 7,
    title: 'ใบที่ ๗ — บุพเพงานวัด',
    poem: 'สายใยรักมั่นคงดั่งด้ายแดง คอยห่วงใยดูแลกันทุกเวลา ยิ่งเกื้อหนุนกันยิ่งเจริญรุ่งเรือง',
    luckLevel: 'รักมั่นคง 🪷'
  },
  {
    number: 9,
    title: 'ใบที่ ๙ — เก้าหน้าก้าวไกล',
    poem: 'เลขเก้ามงคลนำทางชีวิต อุปสรรคใดๆ คลี่คลายหายพลัน มีผู้ใหญ่ใจดีคอยเมตตาสนับสนุน',
    luckLevel: 'โชคดี 🌟'
  },
  {
    number: 12,
    title: 'ใบที่ ๑๒ — ขนมหวานใจฟู',
    poem: 'ช่วงนี้ชีวิตมีเรื่องน่ายินดีเข้ามาให้ยิ้มไม่หุบ ระวังอย่างเดียวคือความหวานของคู่คุณจะทำคนอิจฉา!',
    luckLevel: 'สุขใจ 🍡'
  },
  {
    number: 15,
    title: 'ใบที่ ๑๕ — โคมไฟส่องทาง',
    poem: 'แม้ทางข้างหน้าจะมีเรื่องท้าทาย แต่จะมีแสงสว่างนำทางเสมอ เพียงจับมือกันไว้ให้แน่นๆ',
    luckLevel: 'ราบรื่น 🏮'
  },
  {
    number: 18,
    title: 'ใบที่ ๑๘ — ทองคำรับทรัพย์',
    poem: 'โชคลาภก้อนเล็กก้อนใหญ่กำลังเดินทางมาหา มีเกณฑ์ได้ของขวัญหรือข่าวดีด้านการเงิน',
    luckLevel: 'ร่ำรวย 💰'
  },
  {
    number: 24,
    title: 'ใบที่ ๒๔ — สุขภาพแข็งแรงสดใส',
    poem: 'กายใจเบิกบานแจ่มใส พลังบวกเต็มเปี่ยมทั้งคู่ พักผ่อนให้เพียงพอแล้วลุยตามฝันได้เลย',
    luckLevel: 'สดใส 🌿'
  },
  {
    number: 27,
    title: 'ใบที่ ๒๗ — ดอกบัวบานรับอรุณ',
    poem: 'ความพยายามที่ผ่านมาจะผลิดอกออกผลงดงาม เหมือนดอกบัวที่พ้นน้ำรับแสงจันทร์',
    luckLevel: 'สมหวัง 🌸'
  },
  {
    number: 30,
    title: 'ใบที่ ๓๐ — รักนิรันดร์วันเพ็ญ',
    poem: 'คำอธิษฐานคืนนี้ศักดิ์สิทธิ์นัก ขอให้พูดจาไพเราะและถนอมน้ำใจกัน จะอยู่เคียงคู่สุขใจตลอดไป',
    luckLevel: 'มหาเสน่ห์ 💞'
  }
];

export const QUICK_WISH_CHIPS: string[] = [
  '💖 ขอให้เรารักกันนานๆ อยู่เคียงข้างกันตลอดไป',
  '✨ ขอให้สุขภาพแข็งแรง ปลอดภัยทั้งคู่',
  '🍀 ขอให้สมหวังทุกเรื่องที่ตั้งใจไว้',
  '🌟 ขอให้มีความสุข ยิ้มให้กันได้ทุกวัน',
  '💰 ขอให้เฮงๆ รวยๆ การงานการเงินราบรื่น'
];

export const HAIR_STYLES: { id: HairStyleId; label: string }[] = [
  { id: 'bob', label: 'ผมบ๊อบน่ารัก' },
  { id: 'twin_buns', label: 'มวยคู่ซาลาเปา' },
  { id: 'long_jasmine', label: 'ผมยาวติดดอกมะลิ' },
  { id: 'fluffy_short', label: 'ผมสั้นฟูนุ่ม' },
  { id: 'side_pony', label: 'หางม้าสูงมัดข้าง' },
  { id: 'twin_braids', label: 'เปียคู่ผูกโบ' },
  { id: 'swept_quiff', label: 'ผมสั้นเสยข้าง' },
  { id: 'curtain_part', label: 'แสกกลางเปิดหน้าผาก' },
  { id: 'french_crop', label: 'เฟรนช์ครอปไถข้าง' },
  { id: 'soft_mullet', label: 'มัลเล็ตรากไทร' }
];

export const OUTFIT_STYLES: Record<GenderId, { id: OutfitStyleId; label: string }[]> = {
  female: [
    { id: 'thai_sabai', label: 'จักรี · สไบยกดอก' },
    { id: 'ruean_ton', label: 'เรือนต้น · ซิ่นลายริ้ว' },
    { id: 'dusit', label: 'ดุสิต · ปักกลีบบัว' }
  ],
  male: [
    { id: 'thai_cotton', label: 'เสื้อฝ้าย · ผ้าขาวม้า' },
    { id: 'raj_pattern', label: 'ราชปะแตน · โจงกระเบน' },
    { id: 'short_royal', label: 'เสื้อพระราชทานแขนสั้น' }
  ]
};

export const HAIR_COLORS: { color: string; label: string }[] = [
  { color: '#3a2925', label: 'น้ำตาลเข้ม' },
  { color: '#2b2220', label: 'ดำน้ำตาล' },
  { color: '#5c3c2e', label: 'ช็อกโกแลต' },
  { color: '#a86b43', label: 'คาราเมล' },
  { color: '#e5b887', label: 'บลอนด์น้ำผึ้ง' },
  { color: '#d982a6', label: 'ชมพูพาสเทล' },
  { color: '#8f9de8', label: 'ม่วงลาเวนเดอร์' }
];

export const OUTFIT_COLORS: { color: string; accent: string; label: string }[] = [
  { color: '#ff9ec6', accent: '#ffe18c', label: 'ชมพูกลีบบัว' },
  { color: '#78c9c4', accent: '#f7d57a', label: 'เขียวมิ้นต์ไทย' },
  { color: '#9ab6ff', accent: '#ffd984', label: 'ฟ้าครามพาสเทล' },
  { color: '#c49bff', accent: '#ffe79e', label: 'ม่วงอัญชัน' },
  { color: '#ffb677', accent: '#fff1b8', label: 'ส้มดอกกรรณิการ์' },
  { color: '#f7788a', accent: '#ffe296', label: 'แดงทับทิม' }
];

export const SKIN_TONES: { color: string; label: string }[] = [
  { color: '#ffdfd1', label: 'ขาวอมชมพู' },
  { color: '#f7ccb4', label: 'เนื้อนวล' },
  { color: '#e8b38f', label: 'น้ำผึ้ง' },
  { color: '#cf936c', label: 'แทนอบอุ่น' }
];

export const GLASSES_STYLES: { id: GlassesId; label: string }[] = [
  { id: 'none', label: 'ไม่ใส่' },
  { id: 'round_gold', label: '👓 แว่นกลมทอง' },
  { id: 'heart_pink', label: '🩷 แว่นหัวใจชมพู' },
  { id: 'star_sun', label: '🕶️ แว่นกันแดดดาว' },
  { id: 'cat_eye', label: '✨ แว่นแคทอาย' }
];

export const HAT_STYLES: { id: HatId; label: string }[] = [
  { id: 'none', label: 'ไม่ใส่' },
  { id: 'flower_crown', label: '🌸 มงกุฎดอกไม้' },
  { id: 'cat_ears', label: '🐱 ที่คาดหูแมว' },
  { id: 'beret', label: '🎨 หมวกเบเรต์' },
  { id: 'bucket', label: '🧢 หมวกบักเก็ต' },
  { id: 'thai_chada', label: '👑 ชฎาทองน่ารัก' }
];

export const ACCESSORY_STYLES: { id: AccessoryId; label: string }[] = [
  { id: 'none', label: 'ไม่ใส่' },
  { id: 'gold_necklace', label: '📿 สร้อยคอทองไทย' },
  { id: 'jasmine_garland', label: '🌼 พวงมาลัยคล้องคอ' },
  { id: 'ribbon_bow', label: '🎀 โบว์น่ารัก' },
  { id: 'angel_wings', label: '🪽 ปีกนางฟ้า' }
];

export const GENDER_PRESETS: Record<GenderId, Partial<CharacterConfig>> = {
  female: {
    gender: 'female',
    hairStyle: 'long_jasmine',
    outfitStyle: 'thai_sabai',
    outfitColor: '#ff9ec6',
    accentColor: '#ffe18c'
  },
  male: {
    gender: 'male',
    hairStyle: 'fluffy_short',
    outfitStyle: 'thai_cotton',
    outfitColor: '#78c9c4',
    accentColor: '#f7d57a'
  }
};

export const DEFAULT_COUPLE: [CharacterConfig, CharacterConfig] = [
  {
    id: 1,
    name: 'เธอ',
    gender: 'female',
    hairStyle: 'long_jasmine',
    hairColor: '#3a2925',
    outfitStyle: 'thai_sabai',
    outfitColor: '#ff9ec6',
    accentColor: '#ffe18c',
    skinTone: '#ffdfd1',
    glasses: 'none',
    hat: 'none',
    accessory: 'none'
  },
  {
    id: 2,
    name: 'ฉัน',
    gender: 'male',
    hairStyle: 'fluffy_short',
    hairColor: '#2b2220',
    outfitStyle: 'thai_cotton',
    outfitColor: '#78c9c4',
    accentColor: '#f7d57a',
    skinTone: '#f7ccb4',
    glasses: 'none',
    hat: 'none',
    accessory: 'none'
  }
];
