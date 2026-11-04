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

/** "Xin quẻ" — the bar version of drawing a fortune stick at the pagoda. */
export const FORTUNES: { rank: string; text: string }[] = [
  { rank: "Thượng Thượng", text: "Đêm nay crush rep tin nhắn trong vòng 5 phút. Nhưng chỉ rep \"ok\"." },
  { rank: "Thượng Cát", text: "Có người lạ mời bạn một shot. Uống xong mới biết là nước lọc. Vẫn vui." },
  { rank: "Đại Cát", text: "DJ chơi đúng bài bạn thích. Bạn quẩy đến mức quên luôn tên mình." },
  { rank: "Trung Cát", text: "Sáng mai tỉnh dậy ví vẫn còn, điện thoại vẫn còn. Phước đức ba đời." },
  { rank: "Trung Bình", text: "Bạn sẽ hát theo bài nào cũng sai lời nhưng tự tin 100%." },
  { rank: "Tiểu Cát", text: "Gặp lại người yêu cũ ở quầy bar. Họ béo lên. Bạn thì không." },
  { rank: "Hạ Hạ", text: "Hóa đơn đêm nay dài hơn danh sách việc cần làm của bạn." },
  { rank: "Cát Tường", text: "Bạn sẽ là người quẩy sung nhất bar, được cả phòng vỗ tay." },
  { rank: "Bình An", text: "Đã uống rượu bia, nhớ đặt xe về nhà. Quẻ này ai cũng phải nhận." },
  { rank: "Đại Phát", text: "Có người trả tiền hộ bàn bạn. Đừng hỏi là ai, cứ cảm ơn." },
  { rank: "Hung Nhẹ", text: "Giày đẹp nhất của bạn sẽ bị giẫm đúng lúc drop." },
  { rank: "Thượng Cát", text: "Tấm ảnh selfie đêm nay sẽ thành avatar dùng cả năm." },
  { rank: "Trung Cát", text: "Bạn sẽ kết bạn với một người chỉ biết tên là \"Anh áo đỏ\"." },
  { rank: "Hạ Cát", text: "Sáng mai có cuộc họp 8h. Vũ trụ đã nhắc, bạn tự quyết." },
];

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
  "Linh Lung Linh", "Vy Vui Vẻ", "Yến Yểu Điệu", "Hoa Hấp Háy", "Chi Chanh Chua", "Nhung Nhún Nhảy",
  "Loan Lắc Lư", "Quỳnh Quay Quắt", "Mỹ Mê Mải", "Trâm Trầm Trồ", "Hạnh Hóng Hớt", "Nga Ngả Nghiêng",
  "Thu Thướt Tha", "Hằng Hớn Hở", "Diệu Dịu Dàng", "Xuân Xinh Xắn", "Kim Kiêu Kỳ", "Tuyết Tung Tăng",
];
export const TREND_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

/** Names already taken by the people on stage. */
export const STAGE_NAMES = ["Trang Tưng Tửng", "Nhung Nhún Nhảy", "Lan Lả Lướt"];

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
