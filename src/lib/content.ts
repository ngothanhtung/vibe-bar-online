export type ActionKind = "beer" | "cocktail" | "shot" | "dzo" | "quay" | "confetti" | "horn";

export const ACTIONS: Record<ActionKind, { label: string; emoji: string; verb: string; drink?: boolean }> = {
  beer: { label: "Gọi bia", emoji: "🍺", verb: "vừa gọi một chai bia", drink: true },
  cocktail: { label: "Cocktail", emoji: "🍸", verb: "đang nhâm nhi cocktail", drink: true },
  shot: { label: "Làm 1 shot", emoji: "🥃", verb: "vừa nốc cạn 1 shot", drink: true },
  dzo: { label: "Dzô 100%", emoji: "🥂", verb: "hô DZÔÔÔ cả bar" },
  quay: { label: "Quẩy lên", emoji: "🕺", verb: "đang quẩy banh nóc" },
  confetti: { label: "Pháo giấy", emoji: "🎉", verb: "vừa bắn pháo giấy" },
  horn: { label: "Kèn hơi", emoji: "📯", verb: "thổi kèn hơi" },
};

export const DRUNK_LINES = [
  "Hơi say rồi đó nha 🫠",
  "Thế giới bắt đầu nghiêng nghiêng...",
  "Ai đó gọi xe giùm bạn này!",
];

/**
 * Rhyming / alliterative nicknames in the Vietnamese meme style ("Tư Tí Tửng", "Tuấn Tiền Tỉ"…):
 * a given name followed by two words that start with the same sound. Split by gender so a
 * character's name fits who they are.
 */
export const MALE_NAMES = [
  "Tư Tí Tửng", "Tuấn Tiền Tỉ", "Hưng Héo Hon", "Việt Vu Vơ", "Bảo Bá Báy", "Long Lầy Lội", "Nam Nhây Nhớt",
  "Hùng Hớn Hở", "Quân Quẩy Quá", "Đạt Đô Đô", "Sơn Say Sưa", "Huy Hú Hét", "Kiên Kều Kều", "Duy Dzô Dzô",
  "Giang Gồng Gánh", "Khoa Khè Khè", "Phúc Phê Pha", "Tâm Tăng Tốc", "Dũng Dập Dìu", "Thắng Thất Thểu",
  "Bình Bay Bổng", "Tú Tíu Tít", "Khánh Khéo Khoe", "Sang Sành Sỏi", "Tín Tỉnh Táo", "Hải Hăng Hái",
  "Đông Đứng Đắn", "Lộc Lắc Lư", "Phát Phởn Phơ", "Tùng Tưng Bừng", "Toàn Táo Tợn", "Minh Mộng Mơ",
  "Cường Chịu Chơi", "Hiếu Hí Hửng",
];
export const FEMALE_NAMES = [
  "Lan Lả Lướt", "Phương Phiêu Phiêu", "Thảo Thả Thính", "Trang Tưng Tửng", "Mai Mê Mẩn", "Ngọc Ngơ Ngác",
  "Linh Lung Linh", "Vy Vui Vẻ", "Yến Yểu Điệu", "Hoa Hấp Háy", "Chi Chanh Chua", "Chi Chanh Chua",
  "Loan Lắc Lư", "Quỳnh Quay Quắt", "Mỹ Mê Mải", "Trâm Trầm Trồ", "Hạnh Hóng Hớt", "Nga Ngả Nghiêng",
  "Thu Thướt Tha", "Hằng Hớn Hở", "Diệu Dịu Dàng", "Xuân Xinh Xắn", "Kim Kiêu Kỳ", "Tuyết Tung Tăng",
];
export const TREND_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

/** Names already taken by the people on stage. */
export const STAGE_NAMES = ["Chi Chanh Chua", "Lan Lả Lướt", "Hương Hóng Hớt", "Linh Lí Lắc", "Cường Cay Cú", "Bình Bu Bám"];

type G = "m" | "f";
const poolFor = (g: G) => (g === "m" ? MALE_NAMES : FEMALE_NAMES).filter((n) => !STAGE_NAMES.includes(n));
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Hands out names for one gender at a time without repeats until the pool runs out. */
export function nameDealer() {
  const pools: Record<G, string[]> = { m: [], f: [] };
  return (g: G) => {
    if (pools[g].length === 0) pools[g] = shuffle(poolFor(g));
    return pools[g].pop()!;
  };
}

/** Six demo bots, alternating boy / girl (index 0 is a boy), each with a fitting name. */
const dealBot = nameDealer();
export const BOT_NAMES = Array.from({ length: 6 }, (_, i) => dealBot(i % 2 === 0 ? "m" : "f"));

export const randomTrendName = (g?: G) => {
  const pool = g ? poolFor(g) : TREND_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Ready-made shout-outs in Gen Z club slang, for the 🎲 button next to the chat box. */
export const SHOUT_IDEAS = [
  "Quẩy lên anh em ơiii 🔥",
  "Hôm nay không say không về 🍻",
  "Ai ế ra đây quẩy chung nè 💃",
  "Nhạc này cháy quá DJ ơi 🔥",
  "Một, hai, ba, DZÔ! 🥂",
  "Mai tính, nay quẩy 😎",
  "Đỉnh nóc, kịch trần, bay phấp phới 🚀",
  "Slay quá trời slay 💅",
  "Chill thôi, đừng drama 😌",
  "Lên mood rồi nha 🎶",
  "Xin vía crush tối nay 🙏",
  "Bàn bên ơi, quẩy chung không? 👀",
  "Hết nước chấm luôn 🤌",
  "Vibe hôm nay 10 điểm không có nhưng 💯",
  "Tới công chuyện luôn 💪",
  "Còn thở là còn quẩy 💨",
  "Gen Z không ngủ sớm 🌙",
  "Đi bar mà như đi concert 🎤",
  "Drop đi DJ ơi, đợi lâu quá 😭",
  "Ét ô ét, cháy máy rồi 🆘",
  "Flex nhẹ cái outfit 👟",
  "Nhảy cho đời bớt deadline 📅",
  "Khum say, chỉ hơi phê 🥴",
  "Ủa alo, nhạc hay vậy trời 📞",
  "Quá dữ, quá ghê, quá đỉnh 😱",
  "Đêm nay ai về trước là thua 🏆",
  "Quẩy hết mình, mai hết tiền 💸",
  "Cụng ly cái cho tình thân 🍻",
  "Vũ trụ gửi tín hiệu: quẩy đi! 🛸",
  "Chất như nước cất 💧",
  "Trend gì cũng quẩy được 🕺",
  "Bùng nổ đi nào 💥",
  "Ai nghe bài này mà không lắc là sai 🙅",
  "Real quá anh em ơi 🗿",
  "Mood tụt? Lên nhạc là hết 🎚️",
  "Hông ai cản được tui đâu 🏃",
  "Uống có trách nhiệm, quẩy có tâm 🫡",
  "Đã uống rượu bia thì không lái xe 🚕",
  "DJ ơi cho xin bài nữa đi mà 🥺",
  "Vibe Bar số một, không bàn cãi ✨",
];

export const BOT_SHOUTS = [
  "DJ ơi lên nhạc đi!!!",
  "Quẩy lên anh em ơiii",
  "Bàn 7 dzô cái coi 🥂",
  "Ai đi một mình qua đây chung bàn nè",
  "Drop chưa? Drop chưa???",
  "Mai đi làm nhưng kệ 😎",
  "Chill thôi mọi người",
  "Lên tầng 2 hết đi!",
];

export const AVATAR_COLORS = ["#ff2bd6", "#00e5ff", "#ffe600", "#7cff4f", "#ff7a1a", "#a66bff", "#ff3b5c", "#3bffb0"];

export const randomOf = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
