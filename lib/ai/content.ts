// 本地内容池：离线可用的「AI」素材。二期接真实模型后，这些作为兜底/默认。
// 设计原则：高质量、可复用、覆盖常见成长场景；数量够「换一篇」不重复太快。

export interface BookExcerpt {
  book: string;
  author: string;
  intro: string;
  passage: string;
}

export interface EnglishPassage {
  title: string;
  en: string;
  zh: string;
  vocab: { word: string; meaning: string }[];
  longSentence: { en: string; zh: string };
  phrases: { phrase: string; meaning: string }[];
}

export interface LiteratureItem {
  title: string;
  journal: string;
  excerpt: string;
  cnSummary: string;
  findings: string;
  vocab: { term: string; meaning: string }[];
}

// ---------- 书摘池 ----------
export const BOOK_POOL: BookExcerpt[] = [
  {
    book: "《被讨厌的勇气》",
    author: "岸见一郎 / 古贺史健",
    intro: "用阿德勒心理学拆解「人际关系的烦恼」，强调课题分离与自我决定。",
    passage:
      "自由就是被别人讨厌。只要你执着于认可欲求，就不在自由之中。因为一味寻求别人的认可、在意别人的评价，最终就会活在别人的人生里。",
  },
  {
    book: "《活着》",
    author: "余华",
    intro: "讲述福贵跌宕的一生，底色是苦难，落点却是对生命本身的坚韧与温柔。",
    passage:
      "人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。生活是属于每个人自己的感受，不属于任何别人的看法。",
  },
  {
    book: "《深度工作》",
    author: "卡尔·纽波特",
    intro: "在碎片化时代，专注力成为稀缺资源。本书给出可执行的专注训练方法。",
    passage:
      "高质量产出 = 时间 × 专注度。当你在多任务中来回切换，你以为在节省时间，实际上是在挥霍最宝贵的心智带宽。",
  },
  {
    book: "《小王子》",
    author: "圣埃克苏佩里",
    intro: "写给大人的童话，关于驯养、责任与用「心」去看世界。",
    passage:
      "正是你为你的玫瑰花费的时间，才使你的玫瑰变得如此重要。你要对你驯养的东西负责。",
  },
  {
    book: "《思考，快与慢》",
    author: "丹尼尔·卡尼曼",
    intro: "系统1与系统2的二元心智模型，帮你看清直觉与理性的边界。",
    passage:
      "我们往往过度相信自己讲故事的能力，而对未知保持的谦卑，才是理性真正的起点。",
  },
  {
    book: "《心流》",
    author: "米哈里·契克森米哈赖",
    intro: "当挑战与能力匹配，人会进入忘我的投入状态——这便是幸福的本质。",
    passage:
      "幸福不是静止的享乐，而是当一个人在全身心投入一项艰难却可控的活动时，所体验到的那种清晰的、有序的喜悦。",
  },
  {
    book: "《人类简史》",
    author: "尤瓦尔·赫拉利",
    intro: "从认知革命到科学革命，重新审视「我们是谁、从何而来」。",
    passage:
      "真正让智人胜出的，不是个体更强壮，而是我们能够编织并相信共同的「故事」——货币、国家、公司，皆源于此。",
  },
  {
    book: "《蛤蟆先生去看心理医生》",
    author: "罗伯特·戴博德",
    intro: "用童话式对话讲清心理咨询，关于童年模式与自我重建。",
    passage:
      "没有人能让你不快乐，是你自己选择了不快乐。一旦你意识到这一点，改变的责任与力量，也重新回到了你手里。",
  },
];

// ---------- 英文短文池（CET6 难度，200–300 词） ----------
export const ENGLISH_POOL: EnglishPassage[] = [
  {
    title: "The Power of Small Habits",
    en: "We often underestimate the power of tiny routines. A person who reads two pages every night will finish dozens of books in a year, while someone waiting for the perfect moment reads nothing. Research in behavioral science suggests that habits are not built by motivation, but by repetition in a stable context. When a cue reliably triggers an action, the brain begins to automate it, freeing our attention for harder problems. The key is to start ridiculously small. Want to exercise? Begin with five minutes. Want to write? Open the document and type one sentence. Momentum, once established, carries us further than willpower ever could. Of course, missing a day is inevitable; what matters is that we return the next morning without guilt. Progress is not a straight line, but a slow upward spiral. Over months, these quiet repetitions compound into a life that looks nothing like the one we started with.",
    zh: "我们常常低估微小习惯的力量。一个每晚读两页书的人，一年能读完几十本书；而等待「完美时机」的人，什么都读不完。行为科学的研究表明，习惯不是靠动力养成的，而是在稳定情境中靠重复建立的。当某个线索能可靠地触发一个动作，大脑就会把它自动化，从而把注意力释放给更难的难题。关键是把起点弄得小到荒谬：想运动？先来五分钟。想写作？打开文档写一句话。 momentum（势头）一旦建立，会比意志力带我们走得更远。当然，某天中断在所难免；重要的是第二天不带愧疚地回到轨道。进步不是一条直线，而是一条缓缓上升的螺旋。几个月后，这些安静的重复会复利成一个与起点截然不同的自己。",
    vocab: [
      { word: "underestimate", meaning: "低估" },
      { word: "repetition", meaning: "重复" },
      { word: "automate", meaning: "使自动化" },
      { word: "momentum", meaning: "势头；动力" },
      { word: "compound", meaning: "复利；累积" },
    ],
    longSentence: {
      en: "When a cue reliably triggers an action, the brain begins to automate it, freeing our attention for harder problems.",
      zh: "当某个线索能可靠地触发一个动作时，大脑就开始将它自动化，从而把我们的注意力解放出来去处理更难的难题。",
    },
    phrases: [
      { phrase: "build habits", meaning: "养成习惯" },
      { phrase: "wait for the perfect moment", meaning: "等待完美时机" },
      { phrase: "carry us further", meaning: "带我们走得更远" },
    ],
  },
  {
    title: "Why We Procrastinate",
    en: "Procrastination is rarely about laziness. More often, it is the mind's way of avoiding uncomfortable emotions linked to a task—boredom, anxiety, or a fear of not being good enough. When we delay, we trade a short-term relief for a long-term cost. Psychologists call this present bias: we overvalue the ease of now and undervalue the benefit of later. One useful antidote is to make the task feel smaller and more concrete. Instead of 'write the report', try 'write the first bullet point'. Another is to notice the emotion without fleeing it. Sit with the discomfort for ninety seconds, and the urge to escape often fades. Finally, environment matters. A clean desk and a silenced phone remove the temptations that make avoidance seductive. In the end, discipline is less about iron will and more about designing a life where doing the right thing is the path of least resistance.",
    zh: "拖延很少是关于懒惰。更多时候，它是大脑回避与某项任务相关的不舒服情绪的方式——无聊、焦虑，或「不够好」的恐惧。当我们拖延，我们是用短期的轻松换取长期的代价。心理学家称之为「现时偏差」：我们高估此刻的安逸，低估未来的收益。一个有用的解药是把任务变得更小、更具体。与其「写报告」，不如「写第一个要点」。另一个是觉察情绪而不逃避——忍受不适九十秒，逃离的冲动往往就消退了。最后，环境很重要。整洁的书桌和静音的手机，能移除那些让逃避变得诱人的诱惑。归根结底，自律与其说靠铁一般的意志，不如说是设计一种生活，让做正确的事成为阻力最小的路径。",
    vocab: [
      { word: "procrastination", meaning: "拖延" },
      { word: "antidote", meaning: "解药；对策" },
      { word: "temptation", meaning: "诱惑" },
      { word: "seductive", meaning: "诱人的" },
      { word: "discipline", meaning: "自律；纪律" },
    ],
    longSentence: {
      en: "Instead of 'write the report', try 'write the first bullet point'.",
      zh: "与其「写报告」，不如尝试「写第一个要点」。（对比结构，强调把任务拆解的具体化策略）",
    },
    phrases: [
      { phrase: "trade A for B", meaning: "用A换取B" },
      { phrase: "present bias", meaning: "现时偏差" },
      { phrase: "path of least resistance", meaning: "阻力最小的路径" },
    ],
  },
  {
    title: "Learning How to Learn",
    en: "The most valuable skill of the twenty-first century may be learning how to learn. Traditional education often rewards memorization, yet the world changes too fast for fixed knowledge to last. A better approach is to build mental models—simple explanations of how things work—and to test them constantly. When you explain an idea in your own words and notice where it breaks, you have found the edge of your understanding. Spaced repetition helps move facts from short-term to long-term memory, while interleaving different topics trains the brain to choose the right tool. Equally important is rest. During sleep, the brain consolidates what we learned, quietly knitting new connections. So a student who studies late into the night may learn less than one who sleeps well. Mastery, then, is not cramming; it is a slow, deliberate conversation between curiosity and reflection.",
    zh: "二十一世纪最宝贵的能力，或许是「学会如何学习」。传统教育常常奖励记忆，但世界变化太快，固定的知识难以长久。更好的方法是建立心智模型——关于事物如何运作的简洁解释——并不断检验它们。当你用自己的话解释一个想法，并发现它在何处说不通时，你就找到了自己理解的边界。间隔重复能把事实从短时记忆移入长时记忆，而交错学习不同主题能训练大脑挑选合适的工具。同样重要的是休息：睡眠中，大脑会巩固所学，悄悄织就新的连接。所以熬夜学习的学生，可能不如睡眠充足的人学得多。由此可见，精通不是填鸭，而是好奇心与反思之间一场缓慢而审慎的对话。",
    vocab: [
      { word: "memorization", meaning: "记忆；背诵" },
      { word: "consolidate", meaning: "巩固；加强" },
      { word: "interleaving", meaning: "交错（学习）" },
      { word: "mastery", meaning: "精通；掌握" },
      { word: "cramming", meaning: "填鸭式学习" },
    ],
    longSentence: {
      en: "When you explain an idea in your own words and notice where it breaks, you have found the edge of your understanding.",
      zh: "当你用自己的话解释一个想法并注意到它在何处说不通时，你就找到了自己理解的边界。",
    },
    phrases: [
      { phrase: "mental models", meaning: "心智模型" },
      { phrase: "spaced repetition", meaning: "间隔重复" },
      { phrase: "edge of understanding", meaning: "理解的边界" },
    ],
  },
  {
    title: "The Quiet Strength of Gratitude",
    en: "Gratitude is sometimes dismissed as naive positivity, yet decades of research tell a different story. People who regularly note what they are thankful for tend to sleep better, exercise more, and report lower levels of depression. The mechanism is subtle. By directing attention to what is already good, we interrupt the brain's negativity bias, which evolved to scan for threats. A simple evening practice—writing down three things that went well—can rewire habitual thinking over weeks. Importantly, gratitude is not denial of pain; it is the choice to also see the light. It costs nothing, requires no equipment, and takes less than five minutes. In a culture obsessed with what is missing, pausing to name what is present may be among the most radical acts of self-care available to us.",
    zh: "感恩有时被当作天真的乐观而遭轻视，但数十年的研究讲述了另一番故事。经常记下自己感恩之事的人，往往睡得更好、运动更多，抑郁程度也更低。其机制很微妙：把注意力引向已经拥有的美好，我们就打断了大脑为搜寻威胁而进化出的「负面偏好」。一个简单的晚间练习——写下三件顺利的事——能在数周内重塑习惯性的思维。重要的是，感恩并非否认痛苦，而是选择同时看见光。它分文不费、无需器械、耗时不到五分钟。在一个痴迷于「缺失」的文化里，停下来点名「当下已有」，或许是我们能做的、最具革命性的自我关怀之一。",
    vocab: [
      { word: "naive", meaning: "天真的" },
      { word: "mechanism", meaning: "机制" },
      { word: "bias", meaning: "偏见；偏好" },
      { word: "radical", meaning: "根本的；激进的" },
      { word: "self-care", meaning: "自我关怀" },
    ],
    longSentence: {
      en: "By directing attention to what is already good, we interrupt the brain's negativity bias, which evolved to scan for threats.",
      zh: "通过把注意力引向已经拥有的美好，我们打断了大脑为搜寻威胁而进化出的负面偏好。",
    },
    phrases: [
      { phrase: "dismiss as", meaning: "把…视为…而不予理会" },
      { phrase: "negativity bias", meaning: "负面偏好" },
      { phrase: "obsessed with", meaning: "痴迷于" },
    ],
  },
  {
    title: "Rest Is Part of the Work",
    en: "In many cultures, rest is treated as a reward earned only after exhaustion. This belief is not only false but harmful. Cognitive science shows that the brain does some of its most important work while we are not focused—during walks, showers, and daydreams. These idle moments let loosely connected ideas collide and spark insight. Continuous busyness, by contrast, keeps us on a narrow track and blinds us to alternatives. The most creative people I know protect their downtime as fiercely as their deadlines. They take real breaks: no screens, no notifications, just space. If you feel guilty for resting, remember that a sharp mind is a renewable resource, but only if you let it recover. Productivity is not about doing more hours; it is about bringing a fresh, rested self to the hours you do work.",
    zh: "在许多文化里，休息被当作唯有筋疲力尽后才配享有的奖赏。这种信念不仅错误，而且有害。认知科学表明，大脑一些最重要的工作，恰恰发生在我们不加专注的时候——散步、洗澡、做白日梦之际。这些空闲时刻让松散相连的想法相互碰撞，迸发洞见。相比之下，持续的忙碌把我们困在一条狭窄轨道上，对替代方案视而不见。我认识的最有创造力的人，像守护截止日期一样 fierce 地守护他们的空闲。他们会真正地休息：没有屏幕、没有通知，只有留白。如果你为休息感到内疚，请记住：敏锐的头脑是一种可再生的资源，但只有让它恢复，它才可再生。生产力不在于做更多小时，而在于把你焕然一新、得到休息的自己，带到你工作的那些小时里。",
    vocab: [
      { word: "exhaustion", meaning: "筋疲力尽" },
      { word: "idle", meaning: "空闲的；懒散的" },
      { word: "collide", meaning: "碰撞" },
      { word: "fiercely", meaning: "强烈地；凶猛地" },
      { word: "renewable", meaning: "可再生的" },
    ],
    longSentence: {
      en: "They take real breaks: no screens, no notifications, just space.",
      zh: "他们会真正地休息：没有屏幕、没有通知，只有留白。（冒号后并列强调「真正休息」的内涵）",
    },
    phrases: [
      { phrase: "treat as", meaning: "把…当作" },
      { phrase: "blind to", meaning: "对…视而不见" },
      { phrase: "renewable resource", meaning: "可再生资源" },
    ],
  },
  {
    title: "Reading Widely, Thinking Deeply",
    en: "We live in an age of infinite content and shrinking attention. It is easier than ever to skim a hundred headlines and harder than ever to read one book slowly. Yet deep reading trains a muscle that scrolling cannot: the ability to follow a complex argument across pages, to sit with uncertainty, and to meet another mind on its own terms. When you read a difficult book, you are not consuming information; you are entering a long conversation with someone who may be long dead. Take notes in the margins. Argue back. The goal is not to agree, but to be changed. A well-read person is not a walking encyclopedia, but someone who has practiced thinking from many vantage points. In a noisy world, the quiet act of finishing a book may be a small rebellion—and a profound one.",
    zh: "我们生活在一个内容无限、注意力萎缩的时代。略读一百个标题比慢读一本书前所未有地容易，而慢读一本书却前所未有地难。然而，深度阅读训练的是滑动无法练就的肌肉：在页与页之间追踪复杂论证的能力、与不确定性共处的能力、以及按对方自身的逻辑去遇见另一个心灵的能力。当你读一本难读的书，你不是在消费信息，而是进入一场与或许早已作古之人的漫长对话。在页边做笔记，反驳回去。目标不是认同，而是被改变。一个博览群书的人不是行走的百科全书，而是练习过从多种视角思考的人。在一个喧嚣的世界里，读完一本书这一安静的举动，或许是一次小小的——却深刻的——反抗。",
    vocab: [
      { word: "skim", meaning: "略读；浏览" },
      { word: "scrolling", meaning: "滚动（刷屏）" },
      { word: "vantage", meaning: "视角；有利位置" },
      { word: "rebellion", meaning: "反抗" },
      { word: "profound", meaning: "深刻的；深远的" },
    ],
    longSentence: {
      en: "When you read a difficult book, you are not consuming information; you are entering a long conversation with someone who may be long dead.",
      zh: "当你读一本难读的书，你不是在消费信息，而是进入一场与或许早已作古之人的漫长对话。",
    },
    phrases: [
      { phrase: "deep reading", meaning: "深度阅读" },
      { phrase: "on its own terms", meaning: "按自身的逻辑/条件" },
      { phrase: "walking encyclopedia", meaning: "行走的百科全书" },
    ],
  },
  {
    title: "Cultivating Patience",
    en: "Patience is not passive waiting; it is active trust in a process whose fruits are not yet visible. In a world of instant replies and same-day delivery, we have grown unaccustomed to the slow unfolding of real growth—whether in a relationship, a skill, or a seedling pushing through soil. The impatient mind demands proof now and, finding none, abandons the effort. But meaningful change rarely announces itself daily; it accumulates quietly until a threshold is crossed. A useful practice is to measure inputs rather than outcomes. Did you show up today? That is enough. Results, if the method is sound, will follow on their own schedule. Learning to wait without anxiety is, perhaps, one of the most underrated forms of strength a person can develop.",
    zh: "耐心不是被动的等待，而是对一个尚未显现果实的过程的积极信任。在一个即时回复、当日送达的世界里，我们已不习惯真正成长那种缓慢的展开——无论是在一段关系、一项技能，还是一株破土而出的幼苗之中。不耐烦的心此刻就要证据，找不到便放弃努力。但有意义的变化很少每天都宣告自己；它悄然累积，直到越过某个阈值。一个有用的练习是度量「投入」而非「结果」：今天你出现了吗？那就够了。只要方法可靠，结果会按自己的节奏到来。学会不焦虑地等待，或许是一个人能培养的最被低估的力量之一。",
    vocab: [
      { word: "passive", meaning: "被动的" },
      { word: "unaccustomed", meaning: "不习惯的" },
      { word: "unfolding", meaning: "展开；呈现" },
      { word: "threshold", meaning: "阈值；门槛" },
      { word: "underrated", meaning: "被低估的" },
    ],
    longSentence: {
      en: "But meaningful change rarely announces itself daily; it accumulates quietly until a threshold is crossed.",
      zh: "但有意义的变化很少每天都宣告自己；它悄然累积，直到越过某个阈值。",
    },
    phrases: [
      { phrase: "instant replies", meaning: "即时回复" },
      { phrase: "measure inputs", meaning: "度量投入" },
      { phrase: "on their own schedule", meaning: "按自己的节奏" },
    ],
  },
  {
    title: "The Value of Boring Consistency",
    en: "We romanticize breakthroughs and ignore the dull routines that make them possible. Every impressive result you admire sits on top of hundreds of unremarkable days that no one photographed. The writer's blank page each morning. The runner's same loop in the rain. The student's repeated drills. None of it looks like progress while it happens; only in retrospect does the pattern emerge. Consistency is boring precisely because it works—it removes drama and replaces it with quiet reliability. If you want to be trusted, be predictably good. If you want to improve, repeat the fundamentals longer than feels reasonable. The glamour is a byproduct, never the engine. Show up, do the unglamorous thing, and let time do the rest.",
    zh: "我们浪漫化「突破」，却忽略让突破成为可能的那些枯燥日常。你钦佩的每一个亮眼成果，都建立在数百个无人拍照的平凡日子之上：作家每个清晨的空白页、跑者雨中同样的环线、学生反复的训练。这些在发生之时都不像进步；只有回头看，模式才浮现。一致性之所以无聊，恰恰因为它有效——它去除戏剧性，代之以安静的可靠。若想被人信任，就可靠地好；若想进步，就把基础动作重复到超出「合理」的时长。光鲜是副产品，从来不是引擎。出现，做那件不体面的事，其余交给时间。",
    vocab: [
      { word: "romanticize", meaning: "浪漫化" },
      { word: "unremarkable", meaning: "平凡的；不起眼的" },
      { word: "retrospect", meaning: "回顾" },
      { word: "glamour", meaning: "魅力；光鲜" },
      { word: "byproduct", meaning: "副产品" },
    ],
    longSentence: {
      en: "Every impressive result you admire sits on top of hundreds of unremarkable days that no one photographed.",
      zh: "你钦佩的每一个亮眼成果，都建立在数百个无人拍照的平凡日子之上。",
    },
    phrases: [
      { phrase: "make them possible", meaning: "使它们成为可能" },
      { phrase: "in retrospect", meaning: "回顾起来" },
      { phrase: "do the rest", meaning: "完成剩下的事" },
    ],
  },
];

// ---------- 模拟文献池（首期本地生成，规避爬虫/跨域） ----------
export const LITERATURE_POOL: LiteratureItem[] = [
  {
    title: "Brief Nature Exposure Boosts Cognitive Recovery",
    journal: "Journal of Environmental Psychology",
    excerpt:
      "Participants who viewed natural scenes for 40 seconds after a demanding task showed significantly lower error rates on a subsequent attention test compared with those who viewed urban scenes.",
    cnSummary:
      "一项对照实验发现，在高强度认知任务后观看 40 秒自然景色的人，在随后的注意力测试中错误率明显低于观看城市景观的对照组。说明即便极短暂的「自然暴露」也有助于认知功能的恢复。",
    findings:
      "自然注视可作为低成本的注意力恢复微干预；对需要长时间专注的学习/科研场景有应用价值。",
    vocab: [
      { term: "cognitive recovery", meaning: "认知恢复" },
      { term: "attention test", meaning: "注意力测试" },
      { term: "urban scenes", meaning: "城市景观" },
    ],
  },
  {
    title: "Sleep Spindles Predict Next-Day Memory Consolidation",
    journal: "Nature Neuroscience",
    excerpt:
      "Higher density of sleep spindles during non-REM stage 2 correlated with better overnight retention of procedural skills, independent of total sleep duration.",
    cnSummary:
      "研究发现，非快速眼动睡眠第二期出现的「睡眠纺锤波」密度越高，程序性技能的隔夜保持越好，且该效应与总睡眠时长无关。提示睡眠的「质量结构」比单纯时长更关键。",
    findings:
      "优化睡眠结构（而非仅延长时长）可能更有效提升记忆巩固；为学习节律设计提供依据。",
    vocab: [
      { term: "sleep spindles", meaning: "睡眠纺锤波" },
      { term: "non-REM", meaning: "非快速眼动睡眠" },
      { term: "procedural skills", meaning: "程序性技能" },
    ],
  },
  {
    title: "Micro-habits Outperform Motivation in Long-term Adherence",
    journal: "Health Psychology Review",
    excerpt:
      "A 12-week randomized trial found that participants assigned to 'two-minute' starter habits maintained higher adherence at week 12 than those pursuing outcome-based goals.",
    cnSummary:
      "一项为期 12 周的随机试验显示，被分配「两分钟启动习惯」的参与者在第 12 周的坚持率，高于以结果目标为导向的组别。说明极小的启动行为比依靠动力更能维持长期依从。",
    findings:
      "行为改变设计应优先降低启动门槛；对习惯养成类产品/个人成长工具有直接指导意义。",
    vocab: [
      { term: "adherence", meaning: "依从；坚持" },
      { term: "randomized trial", meaning: "随机试验" },
      { term: "starter habits", meaning: "启动型习惯" },
    ],
  },
  {
    title: "Spaced Retrieval Beats Massed Study for retention",
    journal: "Psychological Science",
    excerpt:
      "Learners who distributed retrieval practice across multiple days recalled 45% more after one month than learners who crammed the same total time in a single session.",
    cnSummary:
      "研究发现，把提取练习分散到多天的学习者，一个月后的记忆保持率比把相同总时长集中在一节课「填鸭」的学习者高出 45%。间隔提取显著优于集中学习。",
    findings:
      "复习计划应嵌入间隔与提取练习；对考试/语言学习类场景价值高。",
    vocab: [
      { term: "spaced retrieval", meaning: "间隔提取" },
      { term: "massed study", meaning: "集中学习（填鸭）" },
      { term: "retention", meaning: "保持率；记忆留存" },
    ],
  },
  {
    title: "Gratitude Journaling Lowers Inflammatory Markers",
    journal: "Clinical Psychological Science",
    excerpt:
      "Adults completing a nightly gratitude list for eight weeks showed reduced salivary IL-6 levels, a marker linked to chronic inflammation and stress.",
    cnSummary:
      "一项研究中，连续 8 周每晚写感恩清单的成年人，其唾液中的 IL-6（与慢性炎症和压力相关的标志物）水平下降。说明感恩书写可能有客观的生理益处。",
    findings:
      "感恩练习或可纳入压力管理的低成本辅助手段；为「身心关联」提供实证支持。",
    vocab: [
      { term: "inflammatory markers", meaning: "炎症标志物" },
      { term: "salivary IL-6", meaning: "唾液白细胞介素-6" },
      { term: "chronic inflammation", meaning: "慢性炎症" },
    ],
  },
  {
    title: "Walking Meetings Increase Creative Output",
    journal: "Applied Psychology",
    excerpt:
      "Groups that held brainstorming walks generated 23% more novel ideas than seated counterparts, with effects persisting after returning indoors.",
    cnSummary:
      "研究发现，进行「散步式头脑风暴」的小组比坐着的小组多产生 23% 的新颖想法，且效果在回到室内后仍持续。身体活动可能促进发散性思维。",
    findings:
      "把部分会议/构思环节移到行走中，或可提升创造力；对个人复盘/规划也有启发。",
    vocab: [
      { term: "brainstorming", meaning: "头脑风暴" },
      { term: "novel ideas", meaning: "新颖想法" },
      { term: "divergent thinking", meaning: "发散性思维" },
    ],
  },
];

// ---------- 今日短文池（暖心/成长向，配「换一篇」） ----------
export const ESSAY_POOL: { title: string; text: string }[] = [
  {
    title: "把一天过成可积累的样子",
    text: "真正的成长不靠某天的鸡血，而靠每天那一点点「不中断」。今天哪怕只做了一件小事，也记得夸夸自己——你又往土壤里埋了一颗种子。",
  },
  {
    title: "允许自己慢慢来",
    text: "树苗不会因为它着急就长得更快。你也不必。把注意力放在「今天比昨天多做了一点」上，时间会把零散的努力连成线。",
  },
  {
    title: "记录，是对抗遗忘的温柔",
    text: "我们总以为自己会记得那些重要的瞬间，可记忆会褪色。今天写下的运动、阅读与感恩，都是未来某个低谷里，能接住你的网。",
  },
  {
    title: "专注是一种可以练习的肌肉",
    text: "不必追求整块的大段时间。把手机放远一点，给一件事 20 分钟不被打断，你就在悄悄训练大脑最深的能力——专注。",
  },
  {
    title: "休息不是偷懒",
    text: "一张一弛才是长久之计。今天如果累了，好好睡一觉、散个步，也是在为明天的自己充电。会休息的人，才走得远。",
  },
  {
    title: "小选择，大不同",
    text: "是翻开书还是刷手机，是出门走两步还是瘫在沙发，无数个小选择叠起来，就是一年后你成为的样子。从下一个小选择开始。",
  },
];

// ---------- 鼓励 / 复盘短句池 ----------
export const ENCOURAGE_POOL: string[] = [
  "今天也辛苦啦，慢慢来，比较快。",
  "小树苗每天长一点点，你也是。",
  "完成比完美更重要，先动起来。",
  "给自己一点耐心，成长需要时间。",
  "你已经比昨天多走了一步，这就很棒。",
  "不必追赶别人的节奏，你有自己的季节。",
  "哪怕只做了一件小事，也是在认真生活。",
  "允许自己偶尔停摆，休息也是前进的一部分。",
];

export const REVIEW_OPENERS: string[] = [
  "这一周期里，你最稳定的坚持是",
  "从数据看，你的高光时刻集中在",
  "相比月初，你在以下方面有了明显积累",
];

/** 随机取一个不同元素（避免连续重复） */
export function pickDistinct<T>(pool: T[], last?: T): T {
  if (pool.length <= 1) return pool[0];
  let next = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (next === last && guard < 10) {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  }
  return next;
}
