export type TarotSection = "major" | "wands" | "cups" | "swords" | "pentacles";

export interface TarotSymbolLesson {
  id: string;
  name: string;
  observation: string;
  source: string;
  connection: string;
  keyword: string;
}

export interface TarotExercise {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface TarotLesson {
  scene: string;
  observationPrompts: string[];
  symbols: TarotSymbolLesson[];
  upright: {
    core: string;
    story: string;
    keywords: string[];
    positive: string;
    risk: string;
    example: string;
  };
  reversed: {
    coreEnergy: string;
    pathways: string[];
    explanation: string;
  };
  exercises: TarotExercise[];
  recallPrompts: string[];
  referenceAnswer: string;
}

export interface TarotCard {
  id: string;
  number?: number;
  chineseName: string;
  englishName: string;
  section: TarotSection;
  rank?: string;
  image?: string;
  source?: string;
  lesson?: TarotLesson;
}

const PUBLIC_DOMAIN_IMAGE_BASE = "https://upload.wikimedia.org/wikipedia/commons";

const majorNames = [
  ["愚人", "The Fool"], ["魔术师", "The Magician"], ["女祭司", "The High Priestess"],
  ["皇后", "The Empress"], ["皇帝", "The Emperor"], ["教皇", "The Hierophant"],
  ["恋人", "The Lovers"], ["战车", "The Chariot"], ["力量", "Strength"],
  ["隐者", "The Hermit"], ["命运之轮", "Wheel of Fortune"], ["正义", "Justice"],
  ["倒吊人", "The Hanged Man"], ["死神", "Death"], ["节制", "Temperance"],
  ["恶魔", "The Devil"], ["高塔", "The Tower"], ["星星", "The Star"],
  ["月亮", "The Moon"], ["太阳", "The Sun"], ["审判", "Judgement"], ["世界", "The World"],
] as const;

const suitNames: Record<Exclude<TarotSection, "major">, string> = {
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币",
};

const ranks = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];

const foolLesson: TarotLesson = {
  scene: "一个年轻人站在高处，抬头望向前方，手里拿着白玫瑰，身旁的小狗正在跳跃。阳光、山谷和轻装行囊共同构成了即将出发的场景。",
  observationPrompts: ["你看到了哪些人物、动物和物品？", "愚人的身体朝向哪里？他的注意力在哪里？", "画面中哪些细节同时带来轻盈与风险的感觉？"],
  symbols: [
    {
      id: "cliff",
      name: "悬崖",
      observation: "愚人走到悬崖边，脚下的路即将中断。",
      source: "悬崖在现实经验中意味着边界、未知和需要谨慎的落差。",
      connection: "他仍然抬头向前，因此悬崖既像冒险的入口，也提醒我们注意准备不足和潜在风险。",
      keyword: "未知、冒险、风险",
    },
    {
      id: "white-rose",
      name: "白玫瑰",
      observation: "愚人手中握着一朵白色的玫瑰。",
      source: "白色常被联想到纯真、清澈和新的开始，玫瑰则常带有情感与生命力的意味。",
      connection: "它让愚人的出发不只是鲁莽，也包含初心、开放和愿意相信世界的部分。",
      keyword: "纯真、初心、开放",
    },
    {
      id: "dog",
      name: "小狗",
      observation: "小狗在愚人身边跳跃，像是在提醒或陪伴他。",
      source: "狗具有警觉、依靠感官行动、陪伴主人的现实特征。",
      connection: "结合悬崖和愚人的姿态，小狗可以被理解为本能的提醒，也可以被理解为一起探索未知的伙伴。",
      keyword: "本能、提醒、陪伴",
    },
    {
      id: "bundle",
      name: "轻装行囊",
      observation: "愚人只带着很小的行囊，身上没有沉重装备。",
      source: "轻装代表负担较少，也意味着资源、经验和准备可能有限。",
      connection: "它支持自由出发的主题，同时提醒我们分辨轻盈与准备不足之间的差别。",
      keyword: "轻装、自由、准备",
    },
  ],
  upright: {
    core: "走向未知，开始一段新的旅程。",
    story: "愚人不是已经知道答案的人，而是愿意迈出第一步的人。画面里的轻装、白玫瑰和小狗让这次出发既有纯真，也有现实提醒。",
    keywords: ["开始", "自由", "开放", "勇气", "尝试"],
    positive: "愿意探索、相信直觉、接受新经验，并允许自己从不确定中学习。",
    risk: "准备不足、冲动冒险、只看见自由而忽略脚下的边界。",
    example: "一个人准备转向新的研究方向，尚未掌握全部答案，但愿意先做小规模尝试并保留复盘空间。",
  },
  reversed: {
    coreEnergy: "走向未知的能量被不同程度地阻滞、放大或偏移。",
    pathways: ["能量过度：冲动冒险，忽略后果。", "能量受阻：害怕未知，不敢迈出第一步。", "能量失衡：追求自由却缺乏方向和责任感。", "能量内化或延迟：新的开始还在内心酝酿，暂时需要准备。"],
    explanation: "逆位不是正位关键词的机械反义词，而是观察同一股“出发能量”在具体情境中如何受阻或失衡。不同流派会有不同侧重，本课程提供的是一套便于推导的基础框架。",
  },
  exercises: [
    { prompt: "小狗最适合从画面和现实联想中推导出哪组含义？", options: ["本能、提醒、陪伴", "权力、秩序、惩罚", "财富、收获、稳定"], answer: "本能、提醒、陪伴", explanation: "小狗靠近愚人并跳跃，结合狗的警觉和陪伴特征，可以推导出提醒、本能与陪伴。" },
    { prompt: "某人想开始新计划，却因为害怕失败迟迟不行动。愚人逆位更接近哪种能量？", options: ["能量过度", "能量受阻", "能量失衡"], answer: "能量受阻", explanation: "这里不是过度冒险，而是走向未知的能量被恐惧挡住了。" },
  ],
  recallPrompts: ["这张牌的核心主题是什么？", "你记得哪些主要象征？为什么这些图案会产生相应含义？", "正位如何理解？它的潜在风险是什么？", "逆位如何从正位核心推导？", "给出一个现实中的应用例子。"],
  referenceAnswer: "愚人的核心是走向未知、开始新的旅程。悬崖带来未知与风险，白玫瑰提示纯真和初心，小狗带来本能、提醒与陪伴，轻装行囊同时意味着自由与准备有限。正位可表示开放、勇敢和尝试，也要留意天真与冒险；逆位应从“出发能量”推导出过度、受阻、失衡或延迟。",
};

export const TAROT_CARDS: TarotCard[] = [
  ...majorNames.map(([chineseName, englishName], number) => ({
    id: `major-${String(number).padStart(2, "0")}`,
    number,
    chineseName,
    englishName,
    section: "major" as const,
    image: number === 0 ? `${PUBLIC_DOMAIN_IMAGE_BASE}/9/90/RWS_Tarot_00_Fool.jpg` : undefined,
    source: number === 0 ? "Rider–Waite–Smith 公版牌图，来源 Wikimedia Commons（Public Domain）" : undefined,
    lesson: number === 0 ? foolLesson : undefined,
  })),
  ...(["wands", "cups", "swords", "pentacles"] as const).flatMap((section) => ranks.map((rank, index) => ({
    id: `${section}-${rank.toLowerCase()}`,
    chineseName: `${suitNames[section]}${rank === "Ace" ? "王牌" : rank === "Page" ? "侍从" : rank === "Knight" ? "骑士" : rank === "Queen" ? "王后" : rank === "King" ? "国王" : rank}`,
    englishName: `${rank} of ${section[0].toUpperCase()}${section.slice(1)}`,
    section,
    rank,
    number: index + 1,
  }))),
];

export function getTarotCard(id: string): TarotCard | undefined {
  return TAROT_CARDS.find((card) => card.id === id);
}

