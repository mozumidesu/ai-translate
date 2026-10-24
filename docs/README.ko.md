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
  <b>🇰🇷&nbsp;한국어</b> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

원하는 AI 모델로 메시지를 번역하는 Discord 플러그인입니다. 번역하면서 당신이 쓰는 방식을 다듬어 없애지 않습니다.

보내는 메시지는 채팅별로, 나가기 전에 번역됩니다. 받은 메시지는 오른쪽 클릭 메뉴에서 요청할 때 번역됩니다.

## 왜 번역기를 또

기계 번역은 산문을 위해 만들어졌습니다. 채팅은 산문이 아닙니다. 소문자로, 말을 다 맺지 않은 채로 흘러가고, 이모티콘으로 지탱되며, 빠진 마침표조차 무언가를 말합니다. 대부분의 번역기는 그것을 조용히 정리해 버리고, 건너편에는 다른 사람이 쓴 양식 편지가 도착합니다.

이 플러그인은 그것을 그대로 두기 위해 만들었습니다. 쓰지 않은 문장 부호를 넣지 않고, 소문자로 남긴 글자를 대문자로 바꾸지 않으며, 줄바꿈을 놓은 자리에 그대로 두고, 이모티콘이 번역할 단어가 아니라 얼굴이라는 것을 압니다.

## 할 수 있는 일

자동 번역은 채팅마다 따로 켜므로, 정말 필요한 대화에서만 작동합니다. 입력줄의 번역 버튼을 왼쪽 클릭하면 패널이 열리고, 오른쪽 클릭하면 지금 채팅을 켜고 끕니다.

받은 메시지는 무엇이든 오른쪽 클릭 메뉴에서 번역할 수 있습니다. 줄임말이나 한 나라에서만 쓰는 낱말, 두 사람만 아는 농담 때문에 번역해도 알 수 없을 때는, 같은 메뉴의 **AI Explain**이 어떤 언어인지 알려주고, 줄임말을 풀어 쓰고, 무슨 뜻이었는지 설명합니다.

대화의 최근 메시지 몇 개가 요청과 함께 가므로, 짧은 "응"이나 "붙여넣기가 안 돼"도 의도한 대로 전달됩니다. 자신만의 어휘를 고정할 수도 있습니다. 절대 번역하면 안 되는 낱말, 번역을 하나로 고정할 용어, 자신에게 쓸 문법상의 성, 그리고 상대를 공손하게 부를지 여부입니다.

메시지 하나가 자기 일부를 그대로 남길 수도 있습니다. 낱말이나 구를 역슬래시 두 개로 감싸면, `\carpe diem\`처럼, 입력한 그대로, 역슬래시만 빠진 채 전송됩니다. 줄 맨 앞의 역슬래시는 그 줄 전체를 남깁니다. 백틱 안의 코드는 절대 번역되지 않습니다.

보낸 메시지 아래에 원문을 남길 수도 있습니다. 나만 볼 수 있어서 실제로 무엇이 나갔는지 확인할 수 있습니다. 이 기능은 직접 켜기 전까지는 꺼져 있습니다. 인터페이스는 16개 언어를 말하며, 따로 정하지 않으면 Discord의 언어를 따릅니다.

## 제공자

API 키는 직접 가져오고, 계속 당신의 것입니다. 이 플러그인에는 자체 서버가 없고 다른 사람의 키를 볼 일도 없습니다.

| 제공자 | 무료 사용량 |
|---|---|
| Groq | 있음 |
| Google Gemini | 있음 |
| Z.ai GLM | 있음, 그리고 앞의 둘이 막힌 곳에서도 닿습니다 |
| Anthropic Claude | 없음 |
| OpenAI 호환 API 전부 | 제공자에 따라 다름 |

두 번째 제공자를 예비로 지정할 수 있습니다. 첫 번째가 혼잡하거나 한도를 다 썼거나 요청을 거부하면, 번역은 당신을 번거롭게 하지 않고 다른 쪽으로 갑니다.

요청은 Discord의 백그라운드 프로세스에서 나가므로, 키가 웹 페이지가 닿을 수 있는 부분으로 들어가는 일은 없습니다.

## 설치

AI Translate는 Discord 앱의 잘 알려진 모드인 Vencord 안에서 동작합니다. 명령 하나가 AI Translate가 이미 들어 있는 Vencord를, 1메가바이트 남짓을 내려받아 Discord에 연결합니다. 당신의 컴퓨터에서는 아무것도 빌드하지 않고, 따로 설치할 것도 없습니다. Windows, macOS, Linux의 일반 Discord와 PTB, Canary에서 동작합니다.

**Windows.** PowerShell을 열고(시작 메뉴에서 "PowerShell" 입력) 붙여 넣으세요.

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS와 Linux.** 터미널을 열고 붙여 넣으세요.

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

화살표 키로 **Install or update**를 고르고 Enter를 누르세요. 어떤 Discord에 연결할지 물으면 같은 방법으로 쓰는 것을 고르세요. Windows에서는 명령이 연결 전에 Discord를 알아서 닫습니다. Linux에서는 비밀번호를 물을 수 있는데, Discord가 보통 관리자만 쓸 수 있는 곳에 있기 때문입니다. 그다음 트레이 아이콘에서까지 Discord를 완전히 끄고 다시 시작하세요.

Bazzite, Silverblue, Kinoite, SteamOS 같은 아토믹 Linux에서도 같은 명령이 동작합니다. 시스템에는 아무것도 설치되지 않고 모두 `~/.aiTranslate`에 들어갑니다. Discord 자체는 Flatpak 판이어야 하며, 그러면 설치 프로그램이 그 Flatpak에 해당 파일 접근 권한을 알아서 줍니다. `rpm-ostree`로 시스템 이미지에 넣은 Discord는 보통 연결할 수 없습니다. 거기서는 시스템 폴더가 읽기 전용이기 때문입니다. 대신 Flatpak 판을 설치하세요.

AI Translate는 이미 켜져 있습니다. **설정 → Vencord → Plugins → AI Translate**를 열고 제공자를 고른 뒤 키를 붙여 넣으세요.

명령이 내려받는 것은 모두 전용 폴더에 들어갑니다. Windows에서는 `%LOCALAPPDATA%\aiTranslate`, macOS와 Linux에서는 `~/.aiTranslate`입니다. Discord를 연결한다는 것은 시작 파일을 작은 파일로 바꿔, 먼저 Vencord를 불러오고 그다음 Discord를 전과 똑같이 불러오게 한다는 뜻입니다. 계정과 설정, 메시지는 건드리지 않습니다.

## 업데이트

할 일은 없습니다. AI Translate는 2일마다 스스로 새 버전을 찾아 백그라운드에서 내려받고 알림을 보여 줍니다. 알림을 누르면 Discord가 새 버전으로 다시 시작합니다. 그냥 두어도 다음에 Discord를 켤 때 업데이트가 적용됩니다. 플러그인 설정 맨 아래의 **업데이트 확인**도 같은 일을 바로 합니다.

새 버전마다 최신 Vencord도 함께 들어 있으므로 Vencord 자체의 수정도 같은 길로 도착합니다. Windows와 Linux에서는 Discord 자체가 업데이트되어도 연결이 남습니다. 그래도 Discord가 업데이트된 뒤에 AI Translate가 사라졌다면, 설치 명령을 한 번 더 실행하세요. 설정을 잃지 않고 설치를 고칩니다.

## 빌드가 만들어지는 방식

Vencord는 자기 안에 빌드된 플러그인만 실행하므로, 내려받는 것은 AI Translate가 들어 있는 Vencord입니다. 손으로 빌드하는 사람은 없습니다. GitHub의 로봇이 매시간 확인하고, Vencord나 AI Translate에 새 버전이 나오면 둘을 각자의 소스에서 함께 빌드해 결과를 [builds.zolatau.com](https://builds.zolatau.com/)에 올립니다. 거기에는 각 빌드가 어떤 소스로 만들어졌는지 적혀 있습니다.

## 제거

설치할 때와 같은 명령을 실행하고 **Remove**를 고르세요. Discord에서 연결을 떼어 내므로 Discord는 전과 똑같아지고, 그다음 내려받은 파일도 지울지 묻습니다. Discord를 완전히 끄고 다시 시작하세요.

API 키와 설정은 내려받은 파일이 아니라 Vencord의 설정과 함께 저장되므로, 나중에 다시 설치해도 그대로 남아 있습니다.

## 이미 Vencord를 직접 빌드하고 있다면

Vencord 폴더에서 이 저장소를 userplugin으로 안에 클론하고 다시 빌드하세요.

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

두 줄 모두 Windows, macOS, Linux에서 같고, `src/userplugins`가 아직 없으면 `git clone`이 만듭니다. 그다음 Discord를 다시 시작하세요. Equicord에서도 똑같이 됩니다. 이렇게 빌드한 사본은 GitHub에서 스스로 업데이트하지 않습니다. `git pull` 후 다시 빌드하세요.

## 무언가 알리기

플러그인 설정 페이지 위쪽의 봉투를 누르면 버그 제보와 요청을 위한 창이 열리고, 스크린샷도 함께 보낼 수 있습니다. 지원 서버 링크도 같은 창에 있습니다.

## 라이선스

GPL-3.0-or-later.
