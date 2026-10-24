<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="README.ro.md">🇷🇴&nbsp;Română</a> ·
  <a href="README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <a href="README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <b>🇻🇳&nbsp;Tiếng Việt</b> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

Một plugin Discord dịch tin nhắn của bạn bằng mô hình AI bạn chọn, và dịch mà
không san phẳng lối viết của bạn.

Tin nhắn bạn gửi được dịch trước khi đi, theo từng cuộc trò chuyện. Tin nhắn bạn
nhận được dịch khi bạn yêu cầu, từ menu chuột phải.

## Vì sao lại thêm một trình dịch nữa

Dịch máy được làm cho văn xuôi. Trò chuyện không phải văn xuôi. Nó viết thường,
nói nửa chừng, sống nhờ kaomoji, và một dấu chấm thiếu cũng đang nói điều gì đó.
Phần lớn trình dịch lặng lẽ dọn hết những thứ ấy đi, và cái đến bên kia đọc
giống một lá thư mẫu do người khác viết.

Cái này được làm ra để không đụng vào. Nó không thêm dấu câu bạn không viết,
không viết hoa chữ bạn để thường, giữ nguyên chỗ bạn xuống dòng, và biết rằng
biểu tượng cảm xúc là một khuôn mặt chứ không phải một từ cần dịch.

## Nó làm được gì

Dịch tự động được bật theo từng cuộc trò chuyện, nên nó chỉ động đến những cuộc
mà bạn thật sự cần. Nhấp chuột trái vào nút dịch trên thanh nhập sẽ mở bảng
điều khiển, nhấp chuột phải sẽ bật hoặc tắt cuộc trò chuyện hiện tại.

Bất kỳ tin nhắn nào bạn nhận đều có thể dịch từ menu chuột phải. Khi ngay cả
bản dịch cũng không giúp bạn hiểu, vì viết tắt, vì một từ chỉ dùng ở một nước
hay một câu đùa riêng của hai người, **AI Explain** trong cùng menu đó sẽ gọi
tên ngôn ngữ, mở các chữ viết tắt ra và nói ý người ta muốn nói là gì.

Vài tin nhắn gần nhất của cuộc trò chuyện đi kèm mỗi yêu cầu, nên một câu "ừ"
trống trơn hay "không dán được" đến nơi đúng như ý. Bạn cũng có thể ghim từ vựng
của riêng mình: những từ không bao giờ được dịch, những thuật ngữ gắn với một
bản dịch cố định, giống ngữ pháp dùng cho chính bạn, và việc xưng hô với người
kia có trang trọng hay không.

Một tin nhắn lẻ cũng có thể giữ lại một phần của chính nó. Đặt một từ hay một
cụm giữa hai dấu gạch chéo ngược, `\carpe diem\`, và nó đi ra đúng như bạn gõ,
không còn dấu gạch chéo; một dấu gạch chéo ngược ở đầu dòng sẽ giữ nguyên cả
dòng đó. Mã trong dấu huyền ngược thì không bao giờ được dịch.

Dưới những tin nhắn bạn đã gửi có thể giữ lại bản gốc, chỉ mình bạn thấy, để bạn
biết thực sự cái gì đã đi ra; cái đó tắt cho đến khi bạn bật. Giao diện nói được
16 thứ tiếng và đi theo ngôn ngữ của Discord chừng nào bạn chưa chọn khác.

## Nhà cung cấp

Khóa API là của bạn mang theo, và vẫn là của bạn. Plugin không có máy chủ riêng
và không bao giờ nhìn thấy khóa của ai.

| Nhà cung cấp | Gói miễn phí |
|---|---|
| Groq | có |
| Google Gemini | có |
| Z.ai GLM | có, và dùng được ở nơi hai cái kia bị chặn |
| Anthropic Claude | không |
| Bất kỳ API tương thích OpenAI nào | tùy nhà cung cấp |

Có thể chỉ định nhà cung cấp thứ hai làm dự phòng. Khi cái thứ nhất quá tải, hết
hạn mức hoặc từ chối yêu cầu, bản dịch lặng lẽ đi qua cái còn lại mà không làm
phiền bạn.

Các yêu cầu được gửi từ tiến trình nền của Discord, nên khóa của bạn không bao
giờ vào phần Discord mà một trang web có thể chạm tới.

## Cài đặt

AI Translate chạy bên trong Vencord, một bản mod nổi tiếng cho ứng dụng Discord.
Một câu lệnh tải về Vencord đã có sẵn AI Translate bên trong, khoảng một
megabyte, rồi nối nó vào Discord. Máy bạn không biên dịch gì cả và cũng không
cần cài thêm gì. Nó chạy với Discord thường, PTB và Canary trên Windows, macOS
và Linux.

**Windows.** Mở PowerShell (menu Start, gõ "PowerShell") rồi dán:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS và Linux.** Mở Terminal rồi dán:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Dùng phím mũi tên chọn **Install or update** rồi nhấn Enter. Khi nó hỏi nối vào
Discord nào, cũng chọn đúng bản bạn dùng. Trên Windows, câu lệnh tự đóng Discord
trước khi nối. Trên Linux nó có thể hỏi mật khẩu, vì Discord thường nằm ở nơi
chỉ quản trị viên mới ghi được. Sau đó thoát hẳn Discord, kể cả từ biểu tượng ở
khay hệ thống, rồi mở lại.

Trên các hệ thống Linux atomic như Bazzite, Silverblue, Kinoite hay SteamOS,
vẫn là câu lệnh đó: nó không cài gì vào hệ thống, mọi thứ nằm trong
`~/.aiTranslate`. Bản Discord nên là bản Flatpak, khi đó trình cài đặt tự cấp
cho Flatpak ấy quyền truy cập những tệp này. Một bản Discord được nhúng vào ảnh
hệ thống bằng `rpm-ostree` thường không nối được, vì ở đó các thư mục hệ thống
chỉ đọc; hãy cài bản Flatpak.

AI Translate đã bật sẵn. Mở **Cài đặt → Vencord → Plugins → AI Translate**, chọn
một nhà cung cấp và dán khóa của bạn.

Mọi thứ câu lệnh tải về đều nằm trong một thư mục riêng:
`%LOCALAPPDATA%\aiTranslate` trên Windows và `~/.aiTranslate` trên macOS và
Linux. Nối Discord nghĩa là đổi tệp khởi động của nó thành một tệp nhỏ, nạp
Vencord trước rồi nạp Discord y như cũ; tài khoản, cài đặt và tin nhắn Discord
của bạn không bị đụng đến.

## Cập nhật

Bạn không phải làm gì cả. Cứ 2 ngày AI Translate tự tìm bản mới, tải về trong
nền và hiện một thông báo; bấm vào đó là Discord khởi động lại với bản mới. Nếu
bạn bỏ qua, bản cập nhật sẽ tự áp dụng vào lần mở Discord tiếp theo. **Kiểm tra
cập nhật** ở cuối phần cài đặt của plugin làm đúng việc đó ngay lập tức.

Mỗi bản mới cũng mang theo Vencord mới nhất, nên các bản sửa lỗi của chính
Vencord cũng đến theo đường này. Trên Windows và Linux, phần nối còn sống sót
qua cả những lần Discord tự cập nhật. Nếu AI Translate vẫn biến mất sau khi
Discord tự cập nhật, hãy chạy lại câu lệnh cài đặt: nó sửa lại bản cài mà không
làm mất cài đặt của bạn.

## Các bản dựng được làm ra thế nào

Vencord chỉ chạy những plugin đã được dựng vào bên trong nó, nên thứ bạn tải về
là Vencord có AI Translate ở trong. Không ai dựng bằng tay: một con robot trên
GitHub kiểm tra mỗi giờ, và hễ Vencord hay AI Translate có bản mới là nó dựng
cả hai từ chính mã nguồn của chúng rồi đăng kết quả lên
[builds.zolatau.com](https://builds.zolatau.com/), nơi ghi rõ đúng mã nguồn đã
dựng ra từng bản.

## Gỡ cài đặt

Chạy đúng câu lệnh như khi cài rồi chọn **Remove**. Nó gỡ phần nối khỏi Discord,
nên Discord trở lại y như cũ, rồi hỏi có xóa luôn các tệp đã tải về không. Thoát
hẳn Discord rồi mở lại.

Khóa API và cài đặt của bạn được lưu cùng với cài đặt của Vencord, không nằm
trong các tệp đã tải, nên chúng vẫn còn đó nếu sau này bạn cài lại.

## Bạn vốn đã tự dựng Vencord?

Từ thư mục Vencord của bạn, clone kho này vào làm userplugin rồi dựng lại:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Cả hai dòng đều như nhau trên Windows, macOS và Linux, và `git clone` sẽ tạo
`src/userplugins` nếu thư mục đó chưa có. Sau đó khởi động lại Discord. Với
Equicord cũng làm y như vậy. Một bản dựng theo cách này không tự cập nhật từ
GitHub; hãy `git pull` rồi dựng lại.

## Báo một điều gì đó

Chiếc phong bì ở đầu trang cài đặt của plugin mở ra một cửa sổ để báo lỗi và đề
nghị, kèm được cả ảnh chụp màn hình. Máy chủ hỗ trợ cũng được dẫn link trong
chính cửa sổ đó.

## Giấy phép

GPL-3.0-or-later.
