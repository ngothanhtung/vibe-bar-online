# 🪩 Vibe Bar

> Đi chùa online thì có rồi… giờ tới lượt **quẩy bar online**.

Một club 3D chạy trên trình duyệt: sàn LED nhảy theo nhạc, sân khấu có 3 người (DJ Đạt Đú Đởn, MC Minh Màu Mè, DJ Trúc Trơ Trẽn), laser, quả cầu disco, và cả nước cùng quẩy realtime.

**Stack:** Next.js 16 (App Router) · three.js qua `@react-three/fiber` + `drei` + postprocessing · Firebase (Anonymous Auth + Firestore) · Web Audio API · Tailwind v4 · zustand

## Tính năng

| Ở chùa online | Ở Quẩy Bar Online |
|---|---|
| Thắp hương | 🍺 Gọi bia · 🍸 Cocktail |
| Gõ mõ | 🥂 Dzô 100% · 🕺 Quẩy lên · 🎉 Pháo giấy |
| Cầu an | 🚕 Nhắc "Đã uống rượu bia thì không lái xe" khi bạn say |

- **Nhân vật kiểu đồ chơi tối giản:** đầu tròn to với tóc bát úp, hai mắt chấm đen và miệng cười; thân hình trụ, tay chân dạng ống tròn, giày khối bo góc; màu mờ phẳng, không viền. Áo vest có sơ mi trắng và nơ cổ, váy liền xòe chuông. Nút **👾 Pixel** để chuyển sang render pixel art (mặc định tắt). Có nam và nữ (chọn ở màn hình vào bar), nhiều kiểu tóc (bát úp, dựng gai, trọc, dài, búi, đuôi ngựa, nón lưỡi trai), áo (thun, tay dài, ba lỗ, hoodie, váy liền), quần hoặc váy, kính, nơ. Có đồ dân chơi: kính đen, dây chuyền vàng, sơ mi hoa, áo khoác mở, nón bucket, snapback đội ngược, băng đô, tai mèo. Khoảng 1/5 số người mặc **trang phục siêu anh hùng** nguyên bản (không dùng thiết kế của Marvel/DC): áo choàng có ngôi sao và mặt nạ, bộ giáp có kính visor phát sáng, hoặc ninja. Áo choàng bay theo điệu nhảy. Áo theo màu bạn chọn; bấm **🎲 Đổi đồ** để random bộ khác, hoặc **🦸 Siêu anh hùng** để random một bộ siêu anh hùng. Cả bộ đồ được gói thành một số `look` và đồng bộ qua Firebase. Mở **`/lineup`** để xem đủ 31 điệu, mỗi nhân vật một điệu, dưới ánh sáng rõ.
- **31 điệu nhảy:** đấm tay, dang tay lắc lư, giơ tay, chill chống cằm, Shuffle, Floss, Dab, Bay lắc, Cưỡi ngựa, Con gà, Xoay vòng, Vỗ tay, Bật nhảy, Headbang guitar, Sóng tay, Ngồi đá chân, Lắc hông, Vẩy tóc, và 13 điệu trend Gen Z: Griddy, Hit the Woah, Shoot, Whip Nae Nae, Smurf, Gwara Gwara, Lướt sóng, Tay mì, Moonwalk, Bắn tim, Disco chỉ trời, Two-step, Cuộn tay. Mọi khớp đều được làm mượt nên chuyển động và chuyển điệu không bị giật. Đám đông tự đổi điệu mỗi 8 đến 16 nhịp; bật Lofi thì chỉ nhảy điệu chậm. Khi **DROP** cả bar, kể cả người chơi và dàn DJ, cùng nhảy chung một điệu. Bấm **💃 Điệu nhảy** để chọn điệu cho mình; điệu bạn chọn được đồng bộ để người khác thấy.
- **Laser hoành tráng:** dàn 12 đầu laser (8 đầu trên giàn phía sau và 4 đầu trên hai tường bên) bắn 96 tia. Mỗi tia có lõi sáng và quầng mờ như xuyên qua khói. Cứ 16 nhịp lại đổi màn, xoay vòng 5 màn: quạt quét, đường hầm xoay, cắt kéo, đuổi nhịp và bắn ngang qua đầu khán giả; màn bắn ngang có thêm một lớp sóng laser (liquid sky) gợn trên đầu đám đông. Khi DROP thì laser chuyển trắng cầu vồng và nháy strobe.
- **LED hai bên phòng:** mỗi bên tường có một tấm LED dài 12 m phía trên dãy bàn, chạy equalizer cùng nhịp với tường sau.
- **Bảng hiệu LED "VIBE BAR":** phần giữa tường LED (sau MC và DJ) là nền tối cố định, không chạy equalizer. Trên đó tên bar được vẽ bằng chính các bóng LED (dot-matrix), sáng ổn định và chỉ đổi màu chậm, có viền đèn chạy chậm quanh bảng, phía dưới là dòng chat mới nhất, nên chữ luôn dễ đọc. Equalizer chạy ở hai bên tường và hai màn cánh. Logo trên màn hình đổi màu và nháy như bóng đèn.
- **3 quả cầu disco rực rỡ:** một quả lớn ở giữa và hai quả hai bên. Các ô gương lấp lánh khi quả cầu xoay và loé sáng theo kick. Mỗi quả bắn 26 tia màu xuống sàn tạo thành các chấm sáng xoay quanh sàn, kèm đốm lấp lánh khắp phòng. Khi độ phê tăng hoặc DROP thì quay nhanh hơn.
- **LED hai bên sàn:** dải đèn chạy đuổi dọc hai mép sàn theo nốt 1/16, và 5 cột LED mỗi bên làm đồng hồ VU cho phổ nhạc (xanh, vàng, đỏ), có đèn đỉnh đổi màu.
- **Màn LED equalizer thật:** tường LED 24 × 6,5 m phía sau DJ cùng 2 màn cánh xiên hai bên (phòng sâu và trần cao hơn cho thoáng) và panel trước bàn DJ hiện bộ phân tích phổ của nhạc (FFT 2048 điểm chia thành 48 dải tần log từ 40 Hz đến 16 kHz). Bass ở giữa, treble ra hai bên. Cột lên nhanh, xuống chậm như đồng hồ VU, có chấm đỉnh màu trắng giữ lại một chút rồi rơi xuống. Các panel LED xoay vòng 8 bảng màu (VU xanh-vàng-đỏ, cầu vồng, neon hồng tím, băng xanh trắng, lửa, vàng gold, bạc hà tím, sắc màu trôi), đổi mỗi 8 phách và chuyển mượt trong một phách; tường sau, màn cánh và tấm hai bên lệch bảng màu nhau nên không trùng màu. Nhạc YouTube không phân tích được, nên khi phát YouTube phổ được giả lập theo nhịp.
- **Khu DJ mở rộng:** sân khấu rộng 16 × 4,5 m với một bậc cao phía sau dàn DJ; giàn truss nhôm rộng 16,4 m, cao 6,4 m, có 7 đèn moving-head tự xoay quét tia xuống sàn (3 kiểu quét, nháy strobe khi DROP), viền sân khấu LED chạy sóng màu, đèn tròn chạy quanh mép sân khấu. Trên hai cánh sân khấu, mỗi bên có 3 bục gogo phát sáng: 4 vũ công nữ (Chi Chanh Chua, Lan Lả Lướt, Hương Hóng Hớt, Linh Lí Lắc) và ở bục ngoài cùng là 2 vũ công nam cởi trần, mặc quần dài, tóc đinh (Cường Cay Cú, Bình Bu Bám). Các vũ công nữ dáng eo thon, không đeo kính, Chi Chanh Chua và Lan Lả Lướt mặc bikini và boot cao; Hương Hóng Hớt và Linh Lí Lắc mặc áo bikini với quần jean dài; có đèn rọi riêng từ trên xuống, chia 3 cặp đối xứng, mỗi cặp một điệu khác nhau, cùng đổi điệu mỗi 8 nhịp và nhảy đúng phách.
- **Dàn loa PA:** 2 cụm sub 2×2 dưới sàn ở mép ngoài sân khấu, trên mỗi cụm xếp chồng một dàn line-array 6 thùng ngửa dần lên (tổng cao khoảng 3 m, không treo nên không che tường LED), cùng 2 loa trụ giữa phòng. Màng loa nhún theo bass, viền LED dưới mỗi thùng đổi màu theo nhạc.
- **Sân khấu chi tiết:** 2 DJ, mỗi người có 2 máy CDJ (vòng jog phát sáng, màn sóng nhạc, nút play nháy theo nhịp) và một mixer (núm EQ, fader tự chạy, đèn VU nhảy theo bass). MC cầm mic, có laptop logo neon. Mặt trước bàn là panel LED chấm bi chạy theo nhạc; hai bên có ống đèn LED và loa kiểm âm. Khi DROP có cột khói CO2 và pháo lạnh phun tia vàng. Nút **🎧 Xem DJ** đưa camera lên sát sân khấu.
- **Tên vần điệu kiểu trend, đúng giới tính:** gần 60 tên chia nam/nữ (nam: Tư Tí Tửng, Tuấn Tiền Tỉ, Hưng Héo Hon, Việt Vu Vơ…; nữ: Lan Lả Lướt, Thảo Thả Thính, Hương Hóng Hớt, Diệu Dịu Dàng…), ví dụ: Tư Tí Tửng, Tuấn Tiền Tỉ, Hưng Héo Hon, Việt Vu Vơ, Quân Quẩy Quá, Thảo Thả Thính… dùng cho bot và cả đám đông (mỗi người có bảng tên nhỏ trên đầu). Dàn sân khấu có DJ Đạt Đú Đởn, MC Minh Màu Mè, DJ Trúc Trơ Trẽn, và 2 vũ công Chi Chanh Chua, Lan Lả Lướt. Mỗi nhân vật nhận tên hợp với giới tính của mình. Ở màn hình vào bar, bấm **🎲 Gợi ý** để random một tên hợp với Nam/Nữ đã chọn; đổi giới tính thì tên gợi ý tự đổi theo.
- **Bàn ghế kiểu bar:** 11 bàn cao cocktail có viền LED (2 hàng ở bên trái, 1 hàng trước quầy bar), mỗi bàn 3 ghế quầy; 4 góc phòng là sofa lounge chữ U quanh bàn thấp phát sáng. Trên bàn có ly nước nhiều màu. Khoảng 36 khách ngồi lắc lư theo nhạc, cầm ly và thỉnh thoảng nâng lên nhấp. Giữa sàn để trống cho quẩy. Toàn bộ được vẽ instanced nên chỉ thêm khoảng 5 lượt vẽ.
- **Phục vụ bưng bia:** 5 phục vụ mặc vest đen thắt nơ đỏ, bảng tên có 🍺. Họ nâng khay với 3 cốc bia vàng có bọt, đi vòng quanh rìa sàn với bước chân khớp tốc độ: lấy bia ở quầy, dừng ở bàn và lounge để cúi người đặt bia xuống (bay lên 🍺, cốc trên khay vơi dần), hết bia thì quay về quầy lấy thêm.
- **Sàn rộng, chạy mượt:** sàn LED 20 × 14 ô trong phòng rộng 34 m, có 72 người nhảy. Mọi nhân vật (đám đông, người chơi, dàn DJ, vũ công) được vẽ chung bằng instancing, chỉ khoảng 40 lượt vẽ, nên tổng số lượt vẽ mỗi khung hình giảm từ khoảng 590 xuống khoảng 245. Bloom chạy ở nửa độ phân giải. Độ phân giải canvas tự hạ (tới 0,85×) khi máy yếu và tự tăng lại khi FPS hồi. Bảng tên ở xa hoặc ngoài màn hình được ẩn và không ghi lại DOM khi không đổi.
- **Nhảy đúng nhạc:** đồng hồ nhịp được neo vào đúng thời điểm tiếng kick đầu tiên và bù độ trễ loa, nên phách 0 trùng với lúc nghe thấy kick. Mọi động tác có nhịp (lắc đầu, xoắn cổ tay, vẫy tay, xoay vòng, quăng dây, gảy đàn, lắc lư) đều đếm theo nhịp nhạc thay vì theo giây, nên đổi tempo hay đổi thể loại thì động tác cũng nhanh chậm theo.
- **Hip hop cypher:** một vòng 8 b-boy, b-girl mặc đồ đường phố (hoodie, snapback, bucket hat, dây chuyền) nhún và vỗ tay quanh vòng sáng trên sàn. Cứ 8 phách lại có một người bước vào giữa solo: Toprock, Krump, Popping, Freeze, Shuffle, Griddy. Thêm 6 điệu hip hop (Toprock, Bounce, Krump, Popping, Freeze, Cabbage Patch) vào bảng điệu nhảy, nâng tổng lên 37 điệu.
- **Câu hét trend:** cạnh ô "Hét gì đó lên màn hình LED" có nút **🎲** random 40 câu kiểu Gen Z đi bar ("Đỉnh nóc, kịch trần, bay phấp phới 🚀", "Khum say, chỉ hơi phê 🥴", "Mai tính, nay quẩy 😎"…).
- **Nhạc tự tổng hợp** bằng Web Audio, không cần file mp3 nên không dính bản quyền: Vinahouse 138 BPM, EDM Bigroom 128, Lofi Chill 84. Visual bám đúng từng nhịp kick đã lên lịch.
- **Phát nhạc từ YouTube:** mặc định phát [bài này](https://youtu.be/Lak-hzkXRMU?si=YwUhRUSmaYbqNoEO) khi vào bar; bấm **▶ YouTube** trong thanh DJ để dán link khác (`youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `music.youtube.com`), hoặc chọn thể loại DJ để quay lại nhạc tích hợp. Chỉ phát tiếng, video được giấu trong khung 1px. Trình duyệt không cho đọc âm thanh từ YouTube, nên đèn và sàn chạy theo một đồng hồ nhịp: chỉnh BPM bằng −/+ hoặc bấm **👆 Tap nhịp** theo bài 4 lần để đèn bắt đúng nhịp. Video nào chủ kênh chặn nhúng thì sẽ báo lỗi.
- **Độ phê:** mỗi hành động của bạn (và một phần của người khác) làm đầy thanh. Đầy 100% thì **DROP!!!**: chớp sáng, laser và đám đông nhảy mạnh lên.
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
| `presence/{uid}` | `name, color, look, gender, dance (-1…63), x, z, lastSeen`: ai đang ở trong bar và đứng ở đâu. Heartbeat 15s; ai im quá 45s thì bị ẩn. |
| `shouts/{id}` | `uid, name, color, text, kind: chat\|action, action?, createdAt`: chat và các hành động. Chỉ được thêm, không sửa. |
| `stats/global` | `dzo, drinks, quay, confetti`: bộ đếm toàn cầu, rules chỉ cho tăng +1 mỗi lần. |

`firestore.rules` kiểm tra chủ sở hữu, độ dài chuỗi, các key được phép và timestamp phía server.

## Cấu trúc

```
src/
  app/                    layout, page, globals.css
  components/
    Lineup.tsx            trang /lineup: mỗi điệu nhảy một nhân vật
    ClubApp.tsx           ghép gate + scene + HUD, chỉ chạy phía client
    EntryGate.tsx         nhập nickname, chọn màu, check 18+
    Hud.tsx               action bar, chat, feed, độ phê, overlay DROP
    scene/
      ClubScene.tsx       Canvas, postprocessing, camera, độ lắc khi say
      Venue.tsx           sàn LED, màn LED shader, loa, quầy bar, laser, disco ball
      spectrum.ts         phổ nhạc 48 dải dùng chung cho các màn LED
      HipHop.tsx          vòng cypher hip hop với người solo đổi lượt
      Glitter.tsx         3 quả cầu disco với tia và chấm sáng, LED và cột VU hai bên sàn
      Lasers.tsx          giàn laser, 5 màn trình diễn, lớp sóng laser
      StageExtras.tsx     giàn truss, đèn moving-head, viền LED, bục và vũ công gogo
      PaSystem.tsx        sub, line-array xếp chồng, loa trụ (instanced)
      DjBooth.tsx         sân khấu: CDJ, mixer, laptop, panel LED, CO2, pháo lạnh, 3 người biểu diễn
      People.tsx          đám đông NPC (instanced), avatar người chơi, di chuyển
      Furniture.tsx       bàn cocktail, ghế quầy, sofa lounge góc, ly nước, khách ngồi
      Waiters.tsx         phục vụ đi vòng bưng khay bia
      figures.tsx         vẽ instanced cho mọi nhân vật (khoảng 40 lượt vẽ)
      chibi.ts            rig nhân vật kiểu đồ chơi, trang phục, các điệu nhảy
      pixel.tsx           render độ phân giải thấp cho pixel art
      labels.tsx          tên và emoji gắn vào vị trí 3D (DOM thuần)
      Effects.tsx         emoji bay lên, pháo giấy
      pulse.ts            số liệu audio dùng chung cho từng frame
  lib/
    audio.ts              engine nhạc Web Audio + SFX + phân tích
    club.ts               đồng bộ Firebase / chế độ demo bot, doAction, sendShout
    store.ts              zustand store
    content.ts            hành động, tên, câu hét, lời bot
```

---
Nội dung giải trí cho người từ 18 tuổi. Uống có trách nhiệm. 🍻
