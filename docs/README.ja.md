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
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <b>🇯🇵&nbsp;日本語</b> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

好きな AI モデルでメッセージを翻訳する Discord プラグインです。書き方を整えてしまわずに翻訳します。

送るメッセージはチャットごとに、送信前に翻訳されます。受け取ったメッセージは、右クリックメニューから頼んだときに翻訳されます。

## なぜもう一つ翻訳機を

機械翻訳は文章のために作られています。チャットは文章ではありません。小文字で、言いかけのままで、顔文字で成り立っていて、句点がないこと自体が何かを伝えています。たいていの翻訳機はそれを黙って整えてしまい、相手側には誰か別の人が書いた定型文が届きます。

これはそこに手を入れないために作りました。書いていない句読点を足さず、小文字のままにしたところを大文字にせず、改行は置いた場所に残し、顔文字は訳す単語ではなく顔だと知っています。

## できること

自動翻訳はチャットごとに設定するので、本当に必要な会話にだけ働きます。入力欄の翻訳ボタンを左クリックするとパネルが開き、右クリックすると今のチャットのオンとオフが切り替わります。

受け取ったメッセージは、どれでも右クリックメニューから翻訳できます。略語や、ある国でしか使わない言葉や、二人だけに通じる冗談のせいで、翻訳しても意味がわからないときは、同じメニューの **AI Explain** が言語を言い当て、略語をほどき、何が言いたかったのかを説明します。

会話の直近のメッセージがリクエストと一緒に送られるので、ひとことの「うん」や「貼れない」も意図どおりに届きます。自分の語彙を決めておくこともできます。絶対に訳さない語、訳し方を一つに固定する語、自分に使う文法上の性、相手に丁寧な言い方をするかどうか。

一つのメッセージが自分の一部をそのまま残すこともできます。語句をバックスラッシュ二つで囲むと、`\carpe diem\` のように、入力したとおりに、バックスラッシュだけ外れて送られます。行頭のバックスラッシュはその行全体を残します。バッククォートの中のコードは決して訳されません。

送ったメッセージの下に原文を残すこともできます。自分にだけ見えるので、実際に何が出ていったか確かめられます。これは自分でオンにするまで切ってあります。画面の言語は 16 言語で、指定しない限り Discord の言語に合わせます。

## プロバイダー

API キーはご自身のものを使い、あなたのものであり続けます。このプラグインに自前のサーバーはなく、誰かのキーを見ることもありません。

| プロバイダー | 無料枠 |
|---|---|
| Groq | あり |
| Google Gemini | あり |
| Z.ai GLM | あり。前の二つが使えない地域でも届きます |
| Anthropic Claude | なし |
| OpenAI 互換の API すべて | プロバイダーによる |

二つ目を予備のプロバイダーとして指定できます。一つ目が混んでいるとき、枠を使い切ったとき、リクエストを断られたときは、翻訳は黙ってもう一方を通ります。

リクエストは Discord の裏側のプロセスから出るので、キーがウェブページの届く側に入ることはありません。

## 導入

AI Translate は、Discord アプリのよく知られた改造版である Vencord の中で動きます。コマンド一つで、AI Translate を組み込んだ Vencord を、1 メガバイトほど、ダウンロードして Discord につなぎます。お使いのパソコンでは何もビルドしませんし、他に入れるものもありません。Windows、macOS、Linux の通常版 Discord、PTB、Canary で動きます。

**Windows.** PowerShell を開き（スタートメニューで「PowerShell」と入力）、貼り付けます。

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS と Linux.** ターミナルを開いて貼り付けます。

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

矢印キーで **Install or update** を選んで Enter を押します。どの Discord につなぐか聞かれたら、同じように普段使っているものを選びます。Windows ではコマンドがつなぐ前に Discord を閉じます。Linux ではパスワードを聞かれることがあります。Discord はたいてい管理者しか書き込めない場所にあるためです。その後、トレイのアイコンからも含めて Discord を完全に終了し、もう一度起動します。

Bazzite、Silverblue、Kinoite、SteamOS のようなアトミックな Linux でも、同じコマンドで動きます。システムには何も入らず、すべて `~/.aiTranslate` に収まります。Discord 自体は Flatpak 版にしてください。そうすればインストーラーがその Flatpak にファイルへのアクセスを自動で許可します。`rpm-ostree` でシステムイメージに組み込んだ Discord はたいていつなげません。そこではシステムのフォルダーが読み取り専用だからです。代わりに Flatpak 版を入れてください。

AI Translate はすでに有効です。**設定 → Vencord → Plugins → AI Translate** を開き、プロバイダーを選んでキーを貼り付けてください。

コマンドがダウンロードするものは、すべて専用のフォルダーに入ります。Windows では `%LOCALAPPDATA%\aiTranslate`、macOS と Linux では `~/.aiTranslate` です。Discord につなぐというのは、起動ファイルを小さなものに差し替えて、先に Vencord を、その後これまでどおり Discord を読み込ませることです。アカウントや設定、メッセージには触れません。

## ブラウザーで

ブラウザーのタブで使う Discord には、ここまでのものは要りません。Vencord を入れることも、パッチを当てることもありません。同じプラグインが、Vencord ごとユーザースクリプトとしても用意されています。

[Tampermonkey](https://www.tampermonkey.net/) か、ほかのユーザースクリプトマネージャーを入れて、[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js) を開きます。マネージャーがインストールを尋ね、そのあとはそこから自動で更新します。discord.com を開いて、ページを再読み込みします。Vencord Web 拡張機能が入っている場合は切ってください。このスクリプトには Vencord が入っていて、ひとつのタブに二つあるとうまく動きません。

あとは **設定 → Vencord → Plugins → AI Translate** を開き、アプリと同じようにプロバイダーを選んでキーを貼り付けてください。キーはページではなくユーザースクリプトマネージャーが持っていて、リクエストもマネージャー経由で出ます。やめるときは、マネージャーでスクリプトを削除します。

## 更新

何もしなくて構いません。AI Translate は 2 日ごとに自分で新しい版を探し、裏でダウンロードして通知を出します。押せば Discord が新しい版で再起動します。放っておいても、次に Discord を起動したときに適用されます。プラグイン設定のいちばん下の **更新を確認** も同じことをすぐに行います。

新しい版には最新の Vencord も入っているので、Vencord 自体の修正も同じ道で届きます。Windows と Linux では、Discord 自身の更新後も接続は残ります。それでも Discord の更新後に AI Translate が消えてしまったら、導入コマンドをもう一度実行してください。設定はそのままに、導入し直します。

## ビルドの作られ方

Vencord は中にビルドされたプラグインしか動かさないので、ダウンロードするのは AI Translate 入りの Vencord です。手作業で作っている人はいません。GitHub 上のロボットが毎時確認し、Vencord か AI Translate に新しい版が出るたびに、両方をそれぞれのソースから一緒にビルドして、結果を [builds.zolatau.com](https://builds.zolatau.com/) に公開します。そこには、各ビルドの元になったソースが示されています。

## 削除

導入と同じコマンドを実行して **Remove** を選びます。Discord から接続を外すので、Discord は元どおりになり、そのあとダウンロードしたファイルも消すか聞かれます。Discord を完全に終了してから起動し直してください。

API キーと設定はダウンロードしたファイルではなく Vencord の設定と一緒に保存されているので、また入れ直したときにもそのまま残っています。

## すでに自分で Vencord をビルドしている場合

Vencord のフォルダーから、このリポジトリを userplugin として中にクローンしてビルドし直します。

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

2 行とも Windows、macOS、Linux で同じで、`src/userplugins` がまだなければ `git clone` が作ります。そのあと Discord を再起動してください。Equicord でも同じように動きます。この方法でビルドしたものは GitHub から自動更新されません。`git pull` してビルドし直してください。

## 報告する

プラグイン設定ページの上部にある封筒から、不具合の報告や要望のための画面が開きます。スクリーンショットも添えられます。サポートサーバーへのリンクも同じ画面にあります。

## ライセンス

GPL-3.0-or-later.
