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
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <b>🇨🇳&nbsp;中文</b>
</p>

# AI Translate

一个 Discord 插件，用你选择的 AI 模型翻译你的消息，并且不会把你说话的方式抹平。

你发出的消息在发送前被翻译，按聊天分别设置。你收到的消息则在你需要时翻译，从右键菜单里调用。

## 为什么还要再做一个翻译

机器翻译是为文章做的。聊天不是文章。它用小写字母，话说一半，靠颜文字撑着，少一个句号本身就在表达什么。大多数翻译都会悄悄把这些收拾干净，于是对面收到的像是别人写的公文。

这个插件就是为了不去动它而做的。你没写的标点它不会补上，你留作小写的字母它不会改成大写，你换行的位置它照旧保留，而且它知道颜文字是一张脸，不是要翻译的词。

## 它能做什么

自动翻译按聊天单独开启，所以只在你真正需要的对话里起作用。左键点击输入栏的翻译按钮会打开面板，右键点击则开关当前聊天。

收到的任何消息都可以从右键菜单翻译。当翻译本身也帮不上忙时，因为缩写、只在某个国家用的词，或者两个人之间的玩笑，同一菜单里的 **AI Explain** 会说出是哪种语言，把缩写展开，并讲清楚对方想说什么。

对话最近的几条消息会随每次请求一起发出，所以一句干巴巴的「嗯」或者「粘贴不上」也能按原意传达。你也可以固定自己的词汇：永远不翻译的词、固定一种译法的术语、用于你自己的语法性别，以及对对方是否使用敬语。

单条消息也能保留自己的一部分。把一个词或一句话放在两个反斜杠之间，`\carpe diem\`，它就会原样发出，只去掉反斜杠；行首的反斜杠则保留整行。反引号里的代码永远不会被翻译。

你发出的消息下面可以留下原文，只有你自己看得到，便于确认实际发出去的内容；这一项要你自己打开。界面支持 16 种语言，除非你另行指定，否则跟随 Discord 的语言。

## 提供商

API 密钥由你自己提供，并且一直是你的。插件没有自己的服务器，也从不会看到别人的密钥。

| 提供商 | 免费额度 |
|---|---|
| Groq | 有 |
| Google Gemini | 有 |
| Z.ai GLM | 有，而且在前两家被挡住的地方也能用 |
| Anthropic Claude | 无 |
| 任何兼容 OpenAI 的 API | 取决于提供商 |

可以指定第二家作为备用。当第一家繁忙、额度用尽或拒绝请求时，翻译会悄悄走另一家，不来打扰你。

请求从 Discord 的后台进程发出，所以你的密钥永远不会进入网页能够触及的那部分 Discord。

## 安装

AI Translate 运行在 Vencord 里，那是 Discord 桌面端一个很有名的修改版。一条命令就会下载已经内置 AI Translate 的 Vencord，大约一兆字节，并把它接到 Discord 上。你的电脑上不会编译任何东西，也不需要再装别的。它适用于 Windows、macOS 和 Linux 上的普通 Discord、PTB 和 Canary。

**Windows.** 打开 PowerShell（开始菜单里输入「PowerShell」）并粘贴：

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS 和 Linux.** 打开终端并粘贴：

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

用方向键选择 **Install or update** 并按回车。当它询问要接哪个 Discord 时，同样选你在用的那个。在 Windows 上，命令会先自行关闭 Discord 再接入。在 Linux 上它可能要你输入密码，因为 Discord 通常放在只有管理员能写入的位置。之后请彻底退出 Discord，包括托盘图标，再重新启动。

在 Bazzite、Silverblue、Kinoite 或 SteamOS 这类原子化 Linux 上，同一条命令照样可用：它不会往系统里装任何东西，所有文件都落在 `~/.aiTranslate`。Discord 本身请用 Flatpak 版，这样安装程序会自动给那个 Flatpak 授予对这些文件的访问权限。用 `rpm-ostree` 打进系统镜像的 Discord 通常接不上，因为那里的系统目录是只读的；请改装 Flatpak 版。

AI Translate 已经是开启状态。打开 **设置 → Vencord → Plugins → AI Translate**，选择一个提供商并粘贴你的密钥。

命令下载的全部内容都放在单独的一个文件夹里：Windows 上是 `%LOCALAPPDATA%\aiTranslate`，macOS 和 Linux 上是 `~/.aiTranslate`。接入 Discord 的意思是把它的启动文件换成一个很小的文件，先加载 Vencord，再和从前完全一样地加载 Discord；你的账号、设置和消息都不会被动。

## 在浏览器里

在浏览器标签页里用的 Discord 不需要上面这些：不用装 Vencord，也没有什么要打补丁。同一个插件，连着 Vencord，也做成了用户脚本。

装上 [Tampermonkey](https://www.tampermonkey.net/) 或者别的用户脚本管理器，然后打开 [ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js)。管理器会询问是否安装，之后便从那里自动保持更新。打开 discord.com 并刷新页面。如果装了 Vencord Web 扩展，请把它关掉：这个脚本里已经有 Vencord，同一个标签页里两个会打架。

然后打开 **设置 → Vencord → Plugins → AI Translate**，像在应用里一样选择一个提供商并粘贴你的密钥。密钥由用户脚本管理器保管，不在页面里，请求也是经它发出的。想撤掉的话，在管理器里删掉这个脚本。

## 更新

你什么都不用做。AI Translate 每 2 天自己找一次新版本，在后台下载并弹出通知；点一下，Discord 就会带着新版本重启。就算你不理它，更新也会在下次启动 Discord 时自动生效。插件设置最下面的 **检查更新** 会立刻做同样的事。

每个新版本同时带着最新的 Vencord，所以 Vencord 自己的修复也沿着这条路到达。在 Windows 和 Linux 上，接入还能挺过 Discord 自身的更新。如果 Discord 更新之后 AI Translate 还是不见了，再运行一次安装命令：它会修好安装，而不会丢掉你的设置。

## 构建是怎么做出来的

Vencord 只运行被编译进它内部的插件，所以你下载的是内含 AI Translate 的 Vencord。没有人手工构建：GitHub 上的一个机器人每小时检查一次，只要 Vencord 或 AI Translate 有了新版本，它就从各自的源码把两者一起构建出来，并把结果发布到 [builds.zolatau.com](https://builds.zolatau.com/)，那里写明了每个构建所依据的确切源码。

## 卸载

运行与安装相同的命令并选择 **Remove**。它会把接入从 Discord 上取下，Discord 就恢复成原来的样子，随后询问是否连下载的文件一起删除。请彻底退出 Discord 再重新启动。

你的 API 密钥和设置保存在 Vencord 的设置里，而不在下载的文件中，所以以后再装回来时它们都还在。

## 你本来就自己构建 Vencord？

在你的 Vencord 目录里，把这个仓库作为 userplugin 克隆进去并重新构建：

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

这两行在 Windows、macOS 和 Linux 上完全一样，如果 `src/userplugins` 还不存在，`git clone` 会自己创建。之后重启 Discord。Equicord 的做法相同。这样构建出来的副本不会从 GitHub 自动更新；请 `git pull` 后重新构建。

## 反馈

插件设置页面顶部的信封会打开一个窗口，用来提交错误报告和需求，也可以附上截图。支持服务器的链接也在同一个窗口里。

## 许可

GPL-3.0-or-later.
