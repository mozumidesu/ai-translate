<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <b>🇩🇪&nbsp;Deutsch</b> ·
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
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

Ein Discord-Plugin, das deine Nachrichten mit einem KI-Modell deiner Wahl
übersetzt und dabei nicht glattbügelt, wie du schreibst.

Nachrichten, die du sendest, werden vor dem Absenden übersetzt, Chat für Chat.
Nachrichten, die du bekommst, werden übersetzt, wenn du darum bittest, über das
Rechtsklickmenü.

## Warum noch ein Übersetzer

Maschinelle Übersetzung ist für Prosa gemacht. Chat ist keine Prosa. Er läuft
in Kleinschreibung und halben Sätzen, lebt von Kaomoji, und ein fehlender Punkt
sagt etwas. Die meisten Übersetzer räumen das alles stillschweigend auf, und auf
der anderen Seite kommt ein Formbrief an, den jemand anders geschrieben hat.

Dieser ist darum gebaut, es in Ruhe zu lassen. Er setzt keine Satzzeichen, die
du nicht geschrieben hast, macht nichts groß, was du klein gelassen hast, behält
deine Zeilenumbrüche da, wo du sie gesetzt hast, und weiß, dass ein Emoticon ein
Gesicht ist und kein Wort, das übersetzt gehört.

## Was es kann

Die automatische Übersetzung wird pro Chat eingeschaltet, also arbeitet sie nur
dort, wo du sie wirklich brauchst. Linksklick auf den Übersetzen-Knopf in der
Eingabezeile öffnet das Panel, Rechtsklick schaltet den aktuellen Chat ein oder
aus.

Jede empfangene Nachricht lässt sich über das Rechtsklickmenü übersetzen. Wenn
selbst die Übersetzung nicht weiterhilft, wegen Abkürzungen, eines Wortes, das
nur in einem Land benutzt wird, oder eines Witzes zwischen zwei Leuten, nennt
**AI Explain** im selben Menü die Sprache, schreibt die Abkürzungen aus und sagt,
was gemeint war.

Die letzten Nachrichten des Gesprächs gehen mit jeder Anfrage mit, damit ein
bloßes „ja“ oder „es fügt sich nicht ein“ so ankommt, wie es gemeint war. Du
kannst auch dein eigenes Vokabular festlegen: Wörter, die nie übersetzt werden
dürfen, Begriffe mit einer festen Übersetzung, das grammatische Geschlecht für
dich selbst und ob dein Gegenüber geduzt oder gesiezt wird.

Auch eine einzelne Nachricht kann einen Teil von sich behalten. Setze ein Wort
oder eine Wendung zwischen zwei Backslashes, `\carpe diem\`, und sie geht genau
so raus, wie du sie getippt hast, ohne die Backslashes; ein Backslash am
Zeilenanfang behält die ganze Zeile. Code in Backticks wird nie übersetzt.

Unter deinen gesendeten Nachrichten kann das Original stehen bleiben, nur für
dich sichtbar, damit du siehst, was tatsächlich rausging; das ist aus, bis du es
einschaltest. Die Oberfläche spricht 16 Sprachen und folgt der von Discord,
solange du nichts anderes sagst.

## Anbieter

Den API-Schlüssel bringst du selbst mit, und er bleibt deiner. Das Plugin hat
keinen eigenen Server und sieht nie den Schlüssel von jemand anderem.

| Anbieter | Kostenloses Kontingent |
|---|---|
| Groq | ja |
| Google Gemini | ja |
| Z.ai GLM | ja, und erreichbar, wo die anderen beiden gesperrt sind |
| Anthropic Claude | nein |
| Jede OpenAI-kompatible API | hängt vom Anbieter ab |

Ein zweiter Anbieter lässt sich als Reserve eintragen. Wenn der erste überlastet
ist, sein Kontingent aufgebraucht hat oder die Anfrage ablehnt, läuft die
Übersetzung über den anderen, ohne dich damit zu behelligen.

Die Anfragen gehen aus dem Hintergrundprozess von Discord raus, dein Schlüssel
landet also nie in dem Teil von Discord, an den eine Webseite herankommt.

## Installation

AI Translate läuft in Vencord, einem bekannten Mod für die Discord-App. Ein
Befehl lädt Vencord mit bereits eingebautem AI Translate herunter, etwa ein
Megabyte, und verbindet es mit Discord. Auf deinem Rechner wird nichts gebaut
und es muss nichts weiter installiert werden. Es funktioniert mit dem normalen
Discord, PTB und Canary unter Windows, macOS und Linux.

**Windows.** Öffne PowerShell (Startmenü, „PowerShell“ eintippen) und füge ein:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS und Linux.** Öffne das Terminal und füge ein:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Wähle mit den Pfeiltasten **Install or update** und drücke Enter. Wenn gefragt
wird, welches Discord verbunden werden soll, wähle genauso das, das du benutzt.
Unter Windows schließt der Befehl Discord vorher selbst. Unter Linux wird
eventuell dein Passwort abgefragt, weil Discord meist dort liegt, wo nur ein
Administrator schreiben darf. Danach Discord komplett beenden, auch über das
Taskleistensymbol, und neu starten.

Auf atomaren Linux-Systemen wie Bazzite, Silverblue, Kinoite oder SteamOS
funktioniert derselbe Befehl: Ins System wird nichts installiert, alles landet
in `~/.aiTranslate`. Discord selbst sollte das Flatpak sein, dann erteilt der
Installer diesem Flatpak den Zugriff auf diese Dateien von allein. Ein Discord,
das mit `rpm-ostree` ins Systemabbild gelegt wurde, lässt sich meist nicht
verbinden, weil die Systemordner dort nur lesbar sind; nimm stattdessen das
Flatpak.

AI Translate ist bereits eingeschaltet. Öffne **Einstellungen → Vencord →
Plugins → AI Translate**, wähle einen Anbieter und füge deinen Schlüssel ein.

Alles, was der Befehl herunterlädt, liegt in einem eigenen Ordner:
`%LOCALAPPDATA%\aiTranslate` unter Windows und `~/.aiTranslate` unter macOS und
Linux. Discord zu verbinden heißt, seine Startdatei gegen eine kleine zu
tauschen, die erst Vencord lädt und dann Discord genau wie vorher; dein
Discord-Konto, deine Einstellungen und deine Nachrichten bleiben unberührt.

## Im Browser

Discord in einem Browsertab braucht nichts davon: kein Vencord zu installieren,
nichts zu patchen. Dasselbe Plugin, mit Vencord darin, gibt es auch als
Userscript.

Installiere [Tampermonkey](https://www.tampermonkey.net/) oder einen anderen
Userscript-Manager und öffne dann
[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js). Dein
Userscript-Manager bietet die Installation an und hält es danach von dort aus
aktuell. Öffne discord.com und lade die Seite neu. Wenn die
Vencord-Web-Erweiterung installiert ist, schalte sie aus: in diesem Skript
steckt schon Vencord, und zwei davon in einem Tab vertragen sich nicht.

Öffne dann **Einstellungen → Vencord → Plugins → AI Translate**, wähle einen
Anbieter und füge deinen Schlüssel ein, genauso wie in der App. Den Schlüssel
hält der Userscript-Manager, nicht die Seite, und die Anfragen laufen ebenfalls
über ihn. Zum Entfernen lösche das Skript im Userscript-Manager.

## Updates

Du musst nichts tun. AI Translate sucht alle 2 Tage von selbst nach einer neuen
Version, lädt sie im Hintergrund und zeigt eine Benachrichtigung; ein Klick
darauf, und Discord startet in der neuen Version neu. Ignorierst du sie, wird
das Update einfach beim nächsten Start von Discord angewendet. **Nach Updates
suchen** unten in den Einstellungen des Plugins macht dasselbe sofort.

Jede neue Version bringt auch das aktuelle Vencord mit, Vencords eigene
Korrekturen kommen also auf demselben Weg. Unter Windows und Linux übersteht die
Verbindung auch Discords eigene Updates. Sollte AI Translate doch einmal
verschwinden, nachdem Discord sich aktualisiert hat, führe den Installationsbefehl
noch einmal aus: Er repariert die Installation, ohne deine Einstellungen zu
verlieren.

## Wie die Builds entstehen

Vencord führt nur Plugins aus, die in es hineingebaut wurden, du lädst also
Vencord mit AI Translate darin herunter. Von Hand baut das niemand: Ein Roboter
auf GitHub prüft stündlich, und sobald Vencord oder AI Translate eine neue
Version hat, baut er beide aus ihren eigenen Quellen zusammen und
veröffentlicht das Ergebnis auf
[builds.zolatau.com](https://builds.zolatau.com/), wo genau die Quellen stehen,
aus denen jeder Build gebaut wurde.

## Deinstallation

Führe denselben Befehl wie zur Installation aus und wähle **Remove**. Er nimmt
die Verbindung von Discord wieder ab, Discord ist also genau wie vorher, und
fragt dann, ob auch die heruntergeladenen Dateien gelöscht werden sollen.
Discord komplett beenden und neu starten.

Deine API-Schlüssel und Einstellungen liegen bei den Einstellungen von Vencord,
nicht in den heruntergeladenen Dateien, sie sind also noch da, falls du später
wieder installierst.

## Du baust Vencord schon selbst

Klone dieses Repository aus deinem Vencord-Ordner heraus als Userplugin hinein
und baue neu:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Beide Zeilen sind unter Windows, macOS und Linux gleich, und `git clone` legt
`src/userplugins` an, falls es noch nicht existiert. Danach Discord neu starten.
Mit Equicord funktioniert es genauso. Eine so gebaute Kopie aktualisiert sich
nicht selbst von GitHub; mach `git pull` und baue erneut.

## Etwas melden

Der Umschlag oben auf der Einstellungsseite des Plugins öffnet ein Fenster für
Fehlerberichte und Wünsche, Screenshots inklusive. Der Support-Server ist im
selben Fenster verlinkt.

## Lizenz

GPL-3.0-or-later.
