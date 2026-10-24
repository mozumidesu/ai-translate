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
  <b>🇹🇷&nbsp;Türkçe</b> ·
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

Mesajlarınızı seçtiğiniz bir yapay zekâ modeliyle çeviren ve bunu yazış
biçiminizi düzleştirmeden yapan bir Discord eklentisi.

Gönderdiğiniz mesajlar çıkmadan önce, sohbet sohbet çevrilir. Aldığınız
mesajlar ise siz isteyince, sağ tık menüsünden çevrilir.

## Neden bir çevirmen daha

Makine çevirisi düzyazı için yapılmıştır. Sohbet düzyazı değildir. Küçük
harfle ve yarım cümlelerle gider, kaomoji üzerine kuruludur ve eksik bir nokta
bile bir şey anlatır. Çoğu çevirmen bunların hepsini sessizce toparlar, karşı
tarafa da başkasının yazdığı matbu bir mektup ulaşır.

Bu eklenti hiçbirine dokunmamak üzere kurulmuş. Yazmadığınız noktalama
işaretini eklemez, küçük bıraktığınız harfi büyütmez, satır sonlarınızı
koyduğunuz yerde bırakır ve emotikonun çevrilecek bir kelime değil bir yüz
olduğunu bilir.

## Neler yapabilir

Otomatik çeviri her sohbet için ayrı açılır, yani yalnızca gerçekten ihtiyaç
duyduğunuz konuşmalara dokunur. Yazı çubuğundaki çeviri düğmesine sol tıklamak
paneli açar, sağ tıklamak o anki sohbeti açıp kapatır.

Gelen her mesaj sağ tık menüsünden çevrilebilir. Çeviri bile bir şey anlatmadığı
zaman, kısaltmalar, yalnızca bir ülkede kullanılan bir kelime ya da iki kişi
arasındaki bir şaka yüzünden, aynı menüdeki **AI Explain** dilin hangisi
olduğunu söyler, kısaltmaları açar ve neyin kastedildiğini anlatır.

Konuşmanın son birkaç mesajı her istekle birlikte gider, böylece kuru bir
"evet" ya da "yapıştırmıyor" olması gerektiği gibi ulaşır. Kendi sözlüğünüzü de
sabitleyebilirsiniz: asla çevrilmemesi gereken kelimeler, tek bir sabit
karşılığa bağlı terimler, kendiniz için kullanılacak dilbilgisel cinsiyet ve
karşınızdakine resmî hitap edilip edilmeyeceği.

Tek bir mesaj da kendisinin bir parçasını koruyabilir. Bir kelimeyi ya da
ifadeyi iki ters eğik çizgi arasına alın, `\carpe diem\`, tam yazdığınız gibi
gider, ters çizgiler olmadan; satır başındaki bir ters eğik çizgi o satırın
tamamını korur. Ters tırnak içindeki kod hiçbir zaman çevrilmez.

Gönderdiğiniz mesajların altında özgün hâli kalabilir, yalnızca sizin
görebileceğiniz şekilde, böylece gerçekte ne gittiğini görürsünüz; bu, siz
açana kadar kapalıdır. Arayüz 16 dil konuşur ve siz başka bir şey söylemedikçe
Discord'un dilini izler.

## Sağlayıcılar

API anahtarını siz getirirsiniz ve o sizde kalır. Eklentinin kendi sunucusu
yoktur ve kimsenin anahtarını görmez.

| Sağlayıcı | Ücretsiz kullanım |
|---|---|
| Groq | var |
| Google Gemini | var |
| Z.ai GLM | var, ve diğer ikisinin engellendiği yerlerden erişilebilir |
| Anthropic Claude | yok |
| OpenAI uyumlu her API | sağlayıcıya bağlı |

İkinci bir sağlayıcı yedek olarak tanımlanabilir. İlki yoğun olduğunda, kotası
bittiğinde ya da isteği geri çevirdiğinde çeviri sizi rahatsız etmeden diğeri
üzerinden gider.

İstekler Discord'un arka plan sürecinden gönderilir, yani anahtarınız
Discord'un bir web sayfasının ulaşabileceği kısmına hiç girmez.

## Kurulum

AI Translate, Discord uygulamasının tanınmış bir modu olan Vencord'un içinde
çalışır. Tek bir komut, AI Translate'in zaten içinde olduğu Vencord'u indirir,
yaklaşık bir megabayt, ve Discord'a bağlar. Bilgisayarınızda hiçbir şey
derlenmez ve başka bir şey kurmanız gerekmez. Windows, macOS ve Linux'ta normal
Discord, PTB ve Canary ile çalışır.

**Windows.** PowerShell'i açın (Başlat menüsü, "PowerShell" yazın) ve yapıştırın:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS ve Linux.** Terminal'i açın ve yapıştırın:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Ok tuşlarıyla **Install or update** seçip Enter'a basın. Hangi Discord'un
bağlanacağını sorduğunda yine kullandığınızı seçin. Windows'ta komut,
bağlamadan önce Discord'u kendisi kapatır. Linux'ta parolanızı isteyebilir,
çünkü Discord genelde yalnızca yöneticinin yazabildiği bir yerde durur.
Ardından Discord'u tepsi simgesinden de olmak üzere tamamen kapatıp yeniden
başlatın.

Bazzite, Silverblue, Kinoite ya da SteamOS gibi atomik Linux sistemlerinde aynı
komut çalışır: sisteme hiçbir şey kurulmaz, her şey `~/.aiTranslate` içine
iner. Discord'un kendisi Flatpak sürümü olmalı, o zaman kurulum programı o
Flatpak'e bu dosyalara erişimi kendiliğinden verir. `rpm-ostree` ile sistem
imajına gömülmüş bir Discord genelde bağlanamaz, çünkü orada sistem klasörleri
salt okunurdur; onun yerine Flatpak sürümünü kurun.

AI Translate zaten açık. **Ayarlar → Vencord → Plugins → AI Translate** yolunu
açın, bir sağlayıcı seçin ve anahtarınızı yapıştırın.

Komutun indirdiği her şey kendi klasöründe durur: Windows'ta
`%LOCALAPPDATA%\aiTranslate`, macOS ve Linux'ta `~/.aiTranslate`. Discord'u
bağlamak, açılış dosyasını önce Vencord'u sonra Discord'u eskisi gibi yükleyen
küçük bir dosyayla değiştirmek demektir; hesabınıza, ayarlarınıza ve
mesajlarınıza dokunulmaz.

## Güncellemeler

Bir şey yapmanız gerekmez. AI Translate her 2 günde bir yeni sürümü kendisi
arar, arka planda indirir ve bir bildirim gösterir; bildirime tıklarsanız
Discord yeni sürümle yeniden başlar. Aldırmazsanız güncelleme, Discord'u bir
sonraki açışınızda kendiliğinden uygulanır. Eklenti ayarlarının altındaki
**Güncellemeleri denetle** aynı şeyi hemen yapar.

Her yeni sürüm en güncel Vencord'u da getirir, yani Vencord'un kendi
düzeltmeleri de aynı yoldan gelir. Windows ve Linux'ta bağlantı, Discord'un
kendi güncellemelerinden de sağ çıkar. Discord kendini güncelledikten sonra AI
Translate yine de kaybolursa kurulum komutunu bir daha çalıştırın: ayarlarınızı
kaybetmeden kurulumu onarır.

## Derlemeler nasıl yapılıyor

Vencord yalnızca içine derlenmiş eklentileri çalıştırır, yani indirdiğiniz şey
içinde AI Translate olan Vencord'dur. Bunu kimse elle derlemez: GitHub'daki bir
robot her saat kontrol eder ve Vencord ya da AI Translate'in yeni bir sürümü
çıktığında ikisini kendi kaynaklarından birlikte derleyip sonucu
[builds.zolatau.com](https://builds.zolatau.com/) adresinde yayımlar; orada her
derlemenin hangi kaynaktan çıktığı yazılıdır.

## Kaldırma

Kurulumdaki komutun aynısını çalıştırıp **Remove** seçin. Bağlantıyı
Discord'dan alır, böylece Discord tam eskisi gibi olur, sonra indirilen
dosyaların da silinip silinmeyeceğini sorar. Discord'u tamamen kapatıp yeniden
başlatın.

API anahtarlarınız ve ayarlarınız indirilen dosyalarda değil, Vencord'un
ayarlarıyla birlikte tutulur, yani bir gün yeniden kurarsanız hepsi yerinde
olur.

## Vencord'u zaten kendiniz derliyor musunuz?

Vencord klasörünüzden bu depoyu içeri userplugin olarak klonlayıp yeniden
derleyin:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Her iki satır da Windows, macOS ve Linux'ta aynıdır ve `git clone` henüz yoksa
`src/userplugins` klasörünü kendisi oluşturur. Ardından Discord'u yeniden
başlatın. Equicord'da da aynı şekilde çalışır. Böyle derlenen bir kopya
kendisini GitHub'dan güncellemez; `git pull` yapıp yeniden derleyin.

## Bir şey bildirmek

Eklenti ayarları sayfasının üstündeki zarf, ekran görüntüleri de
ekleyebileceğiniz bir hata bildirme ve istek penceresi açar. Destek sunucusunun
bağlantısı da aynı penceredir.

## Lisans

GPL-3.0-or-later.
