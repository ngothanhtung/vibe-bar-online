# 🪩 Quẩy Bar Online

> Đi chùa online thì có rồi… giờ tới lượt **quẩy bar online**.

Một club 3D chạy trên trình duyệt: sàn LED nhảy theo nhạc, sân khấu có 3 người (DJ Đạt Đập Đĩa, MC Minh Máu Mê, DJ Trang Tưng Tửng), laser, quả cầu disco, và cả nước cùng quẩy realtime.

**Stack:** Next.js 16 (App Router) · three.js qua `@react-three/fiber` + `drei` + postprocessing · Firebase (Anonymous Auth + Firestore) · Web Audio API · Tailwind v4 · zustand

## Tính năng

| Ở chùa online | Ở Quẩy Bar Online |
|---|---|
| Thắp hương | 🍺 Gọi bia · 🍸 Cocktail · 🥃 Làm 1 shot |
| Gõ mõ | 🥂 Dzô 100% · 📯 Kèn hơi |
| Xin xăm | 🔮 **Xin quẻ đêm nay** (14 quẻ, có cả quẻ "Hạ Hạ") |
| Cầu an | 🚕 Nhắc "Đã uống rượu bia thì không lái xe" khi bạn say |

- **Nhân vật kiểu đồ chơi tối giản:** đầu tròn to với tóc bát úp, hai mắt chấm đen và miệng cười; thân hình trụ, tay chân dạng ống tròn, giày khối bo góc; màu mờ phẳng, không viền. Áo vest có sơ mi trắng và nơ cổ, váy liền xòe chuông. Nút **👾 Pixel** để chuyển sang render pixel art (mặc định tắt). Có nam và nữ (chọn ở màn hình vào bar), nhiều kiểu tóc (bát úp, dựng gai, trọc, dài, búi, đuôi ngựa, nón lưỡi trai), áo (thun, tay dài, ba lỗ, hoodie, váy liền), quần hoặc váy, kính, nơ. Có đồ dân chơi: kính đen, dây chuyền vàng, sơ mi hoa, áo khoác mở, nón bucket, snapback đội ngược, băng đô, tai mèo. Khoảng 1/5 số người mặc **trang phục siêu anh hùng** nguyên bản (không dùng thiết kế của Marvel/DC): áo choàng có ngôi sao và mặt nạ, bộ giáp có kính visor phát sáng, hoặc ninja. Áo choàng bay theo điệu nhảy. Áo theo màu bạn chọn; bấm **🎲 Đổi đồ** để random bộ khác, hoặc **🦸 Siêu anh hùng** để random một bộ siêu anh hùng. Cả bộ đồ được gói thành một số `look` và đồng bộ qua Firebase. Mở **`/lineup`** để xem 16 nhân vật nhảy đủ 16 điệu dưới ánh sáng rõ.
- **18 điệu nhảy:** đấm tay, dang tay lắc lư, giơ tay, chill chống cằm, Shuffle, Floss, Dab, Bay lắc (lắc đầu, xoay cổ tay), Cưỡi ngựa (có quăng dây), Con gà, Xoay vòng, Robot, Bật nhảy (có nhảy dang chân tay), Headbang và guitar tưởng tượng, Sóng tay, Ngồi đá chân, Lắc hông, Vẩy tóc. Đám đông tự đổi điệu mỗi 8 đến 16 nhịp; bật Lofi thì chỉ nhảy điệu chậm. Khi **DROP** cả bar, kể cả người chơi và dàn DJ, cùng nhảy chung một điệu. Bấm **💃 Điệu nhảy** để chọn điệu cho mình; điệu bạn chọn được đồng bộ để người khác thấy.
- **Laser hoành tráng:** dàn 12 đầu laser (8 đầu trên giàn phía sau và 4 đầu trên hai tường bên) bắn 96 tia. Mỗi tia có lõi sáng và quầng mờ như xuyên qua khói. Cứ 16 nhịp lại đổi màn, xoay vòng 5 màn: quạt quét, đường hầm xoay, cắt kéo, đuổi nhịp và bắn ngang qua đầu khán giả; màn bắn ngang có thêm một lớp sóng laser (liquid sky) gợn trên đầu đám đông. Khi DROP thì laser chuyển trắng cầu vồng và nháy strobe.
- **Khu DJ mở rộng:** giàn truss nhôm bao quanh sân khấu với 6 đèn moving-head tự xoay quét tia xuống sàn (3 kiểu quét, nháy strobe khi DROP), viền sân khấu LED chạy sóng màu, đèn tròn chạy quanh mép sân khấu. Hai bên có 2 bục gogo phát sáng với vũ công mặc bikini (hồng và xanh ngọc) và boot cao, có đèn rọi riêng từ trên xuống, nhảy đồng bộ nhau và tự đổi điệu mỗi 8 nhịp.
- **Sân khấu chi tiết:** 2 DJ, mỗi người có 2 máy CDJ (vòng jog phát sáng, màn sóng nhạc, nút play nháy theo nhịp) và một mixer (núm EQ, fader tự chạy, đèn VU nhảy theo bass). MC cầm mic, có laptop logo neon. Mặt trước bàn là panel LED chấm bi chạy theo nhạc; hai bên có ống đèn LED và loa kiểm âm. Khi DROP có cột khói CO2 và pháo lạnh phun tia vàng. Nút **🎧 Xem DJ** đưa camera lên sát sân khấu.
- **Tên vần điệu kiểu trend, đúng giới tính:** gần 60 tên chia nam/nữ (nam: Tư Tí Tửng, Tuấn Tiền Tỉ, Hưng Héo Hon, Việt Vu Vơ…; nữ: Lan Lả Lướt, Thảo Thả Thính, Xuân Xinh Xắn, Diệu Dịu Dàng…), ví dụ: Tư Tí Tửng, Tuấn Tiền Tỉ, Hưng Héo Hon, Việt Vu Vơ, Quân Quẩy Quá, Thảo Thả Thính… dùng cho bot và cả đám đông (mỗi người có bảng tên nhỏ trên đầu). Dàn sân khấu có DJ Đạt Đập Đĩa, MC Minh Máu Mê, DJ Trang Tưng Tửng, và 2 vũ công Nhung Nhún Nhảy, Lan Lả Lướt. Mỗi nhân vật nhận tên hợp với giới tính của mình. Ở màn hình vào bar, bấm **🎲 Gợi ý** để random một tên hợp với Nam/Nữ đã chọn; đổi giới tính thì tên gợi ý tự đổi theo.
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
| `presence/{uid}` | `name, color, look, gender, dance, x, z, lastSeen`: ai đang ở trong bar và đứng ở đâu. Heartbeat 15s; ai im quá 45s thì bị ẩn. |
| `shouts/{id}` | `uid, name, color, text, kind: chat\|action, action?, createdAt`: chat và các hành động. Chỉ được thêm, không sửa. |
| `stats/global` | `dzo, drinks, quay, confetti`: bộ đếm toàn cầu, rules chỉ cho tăng +1 mỗi lần. |

`firestore.rules` kiểm tra chủ sở hữu, độ dài chuỗi, các key được phép và timestamp phía server.

## Cấu trúc

```
src/
  app/                    layout, page, globals.css
  components/
    Lineup.tsx            trang /lineup: 16 chibi nhảy 16 điệu
    ClubApp.tsx           ghép gate + scene + HUD, chỉ chạy phía client
    EntryGate.tsx         nhập nickname, chọn màu, check 18+
    Hud.tsx               action bar, chat, feed, độ phê, xin quẻ, overlay DROP
    scene/
      ClubScene.tsx       Canvas, postprocessing, camera, độ lắc khi say
      Venue.tsx           sàn LED, màn LED shader, loa, quầy bar, laser, disco ball
      Lasers.tsx          giàn laser, 5 màn trình diễn, lớp sóng laser
      StageExtras.tsx     giàn truss, đèn moving-head, viền LED, bục và vũ công gogo
      DjBooth.tsx         sân khấu: CDJ, mixer, laptop, panel LED, CO2, pháo lạnh, 3 người biểu diễn
      People.tsx          đám đông NPC (instanced), avatar người chơi, di chuyển
      chibi.ts            rig nhân vật kiểu đồ chơi, trang phục, các điệu nhảy
      pixel.tsx           render độ phân giải thấp cho pixel art
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
