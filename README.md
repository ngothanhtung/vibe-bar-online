# 🪩 Quẩy Bar Online

> Đi chùa online thì có rồi… giờ tới lượt **quẩy bar online**.

Một club 3D chạy trên trình duyệt: sàn LED nhảy theo nhạc, DJ robot, laser, quả cầu disco, và cả nước cùng quẩy realtime.

**Stack:** Next.js 16 (App Router) · three.js qua `@react-three/fiber` + `drei` + postprocessing · Firebase (Anonymous Auth + Firestore) · Web Audio API · Tailwind v4 · zustand

## Tính năng

| Ở chùa online | Ở Quẩy Bar Online |
|---|---|
| Thắp hương | 🍺 Gọi bia · 🍸 Cocktail · 🥃 Làm 1 shot |
| Gõ mõ | 🥂 Dzô 100% · 📯 Kèn hơi |
| Xin xăm | 🔮 **Xin quẻ đêm nay** (14 quẻ, có cả quẻ "Hạ Hạ") |
| Cầu an | 🚕 Nhắc "Đã uống rượu bia thì không lái xe" khi bạn say |

- **Nhân vật chibi đa dạng:** đầu tròn to, người nhỏ, tay chân ngắn. Có nam và nữ (chọn ở màn hình vào bar). Mỗi người có kiểu tóc riêng (ngắn, trọc, dài, búi, đuôi ngựa, nón lưỡi trai), áo (thun, tay dài, ba lỗ, hoodie, váy liền), quần hoặc váy (quần dài, quần short, chân váy), có thể đeo kính, nơ, má hồng, với nhiều màu da, tóc và giày. Áo theo màu bạn chọn. Bấm **🎲 Đổi đồ** để random bộ khác. Cả bộ đồ được gói thành một số `look` và đồng bộ qua Firebase, nên người khác thấy đúng bộ bạn mặc. Mỗi người có 4 kiểu nhảy: đấm tay, dang tay, giơ hai tay, chống cằm chill.
- **Nhạc tự tổng hợp** bằng Web Audio, không cần file mp3 nên không dính bản quyền: Vinahouse 138 BPM, EDM Bigroom 128, Lofi Chill 84. Visual bám đúng từng nhịp kick đã lên lịch.
- **Phát nhạc từ YouTube:** bấm **▶ YouTube** trong thanh DJ rồi dán link (`youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `music.youtube.com`). Chỉ phát tiếng, video được giấu trong khung 1px. Trình duyệt không cho đọc âm thanh từ YouTube, nên đèn và sàn chạy theo một đồng hồ nhịp: chỉnh BPM bằng −/+ hoặc bấm **👆 Tap nhịp** theo bài 4 lần để đèn bắt đúng nhịp. Video nào chủ kênh chặn nhúng thì sẽ báo lỗi.
- **Độ phê:** mỗi hành động của bạn (và một phần của người khác) làm đầy thanh. Đầy 100% thì **DROP!!!**: chớp sáng, kèn hơi, laser và đám đông nhảy mạnh lên.
- **Độ say:** uống càng nhiều thì cả thế giới càng nghiêng và màu bị lệch (chromatic aberration), rồi tỉnh dần theo thời gian.
- **Multiplayer realtime:** thấy avatar và tên của người khác trên sàn, họ đi lại, uống, bắn pháo giấy là hiện ngay chỗ họ đứng. Câu hét chat được chiếu lên màn LED sau lưng DJ. Có bộ đếm toàn cầu (lần dzô, ly đã cạn, lượt quẩy, pháo giấy).
- **Điều khiển:** WASD / phím mũi tên, hoặc chạm vào sàn để đi tới đó; kéo để xoay camera, cuộn để zoom.
- **Chế độ demo:** nếu chưa cấu hình Firebase, app vẫn chạy với 6 bot tự quẩy, tự chat.

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Không có file `.env.local` thì app chạy ở chế độ demo.

## Kết nối Firebase

1. Tạo project trên [Firebase console](https://console.firebase.google.com), thêm một **Web app**.
2. **Authentication → Sign-in method → bật Anonymous**.
3. **Firestore Database → Create database**.
4. `cp .env.example .env.local` rồi điền config của web app vào.
5. Deploy rules (cần `firebase-tools`):

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add   # chọn project
   npx firebase-tools deploy --only firestore:rules
   ```

### Data model

| Path | Nội dung |
|---|---|
| `presence/{uid}` | `name, color, look, gender, x, z, lastSeen`: ai đang ở trong bar và đứng ở đâu. Heartbeat 15s; ai im quá 45s thì bị ẩn. |
| `shouts/{id}` | `uid, name, color, text, kind: chat\|action, action?, createdAt`: chat và các hành động. Chỉ được thêm, không sửa. |
| `stats/global` | `dzo, drinks, quay, confetti`: bộ đếm toàn cầu, rules chỉ cho tăng +1 mỗi lần. |

`firestore.rules` kiểm tra chủ sở hữu, độ dài chuỗi, các key được phép và timestamp phía server.

## Cấu trúc

```
src/
  app/                    layout, page, globals.css
  components/
    ClubApp.tsx           ghép gate + scene + HUD, chỉ chạy phía client
    EntryGate.tsx         nhập nickname, chọn màu, check 18+
    Hud.tsx               action bar, chat, feed, độ phê, xin quẻ, overlay DROP
    scene/
      ClubScene.tsx       Canvas, postprocessing, camera, độ lắc khi say
      Venue.tsx           sàn LED, màn LED shader, DJ booth, loa, quầy bar, laser, disco ball
      People.tsx          đám đông NPC (instanced), avatar người chơi, di chuyển
      chibi.ts            rig nhân vật chibi, bảng màu trang phục, các điệu nhảy
      labels.tsx          tên và emoji gắn vào vị trí 3D (DOM thuần)
      Effects.tsx         emoji bay lên, pháo giấy
      pulse.ts            số liệu audio dùng chung cho từng frame
  lib/
    audio.ts              engine nhạc Web Audio + SFX + phân tích
    club.ts               đồng bộ Firebase / chế độ demo bot, doAction, sendShout
    store.ts              zustand store
    content.ts            hành động, quẻ, lời bot
```

---
Nội dung giải trí cho người từ 18 tuổi. Uống có trách nhiệm. 🍻
