<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <b>🇫🇷&nbsp;Français</b> ·
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

Un plugin Discord qui traduit vos messages avec le modèle d'IA de votre choix,
sans lisser votre façon d'écrire.

Les messages que vous envoyez sont traduits avant de partir, salon par salon.
Les messages que vous recevez sont traduits quand vous le demandez, depuis le
menu du clic droit.

## Pourquoi encore un traducteur

La traduction automatique est faite pour la prose. Une conversation n'est pas de
la prose. Elle va en minuscules et à moitié dite, elle tient sur les kaomojis,
et un point qui manque veut dire quelque chose. La plupart des traducteurs
rangent tout cela sans rien dire, et de l'autre côté arrive une lettre type
écrite par quelqu'un d'autre.

Celui-ci est construit pour ne pas y toucher. Il n'ajoute pas la ponctuation que
vous n'avez pas mise, ne met pas de majuscule là où vous avez laissé une
minuscule, garde vos retours à la ligne là où vous les avez mis, et sait qu'un
émoticône est un visage et non un mot à traduire.

## Ce qu'il sait faire

La traduction automatique s'active salon par salon, elle n'intervient donc que
là où vous en avez vraiment besoin. Un clic gauche sur le bouton de traduction
dans la barre de saisie ouvre le panneau, un clic droit active ou désactive le
salon en cours.

N'importe quel message reçu peut être traduit depuis le menu du clic droit.
Quand même la traduction ne vous avance à rien, à cause d'abréviations, d'un mot
qu'on n'emploie que dans un pays ou d'une blague entre deux personnes,
**AI Explain** dans ce même menu nomme la langue, développe les abréviations et
dit ce qui était voulu.

Les derniers messages de la conversation partent avec chaque requête, si bien
qu'un simple « oui » ou « ça ne se colle pas » arrive comme il le devait. Vous
pouvez aussi fixer votre propre vocabulaire : les mots à ne jamais traduire, les
termes liés à une traduction fixe, le genre grammatical à utiliser pour vous, et
si l'on vouvoie ou tutoie votre interlocuteur.

Un message isolé peut lui aussi garder une partie de lui-même. Mettez un mot ou
une expression entre deux barres obliques inverses, `\carpe diem\`, et il part
exactement comme vous l'avez tapé, sans les barres ; une barre oblique inverse
en début de ligne garde la ligne entière. Le code entre accents graves n'est
jamais traduit.

Sous vos messages envoyés, l'original peut rester, visible de vous seul, pour
que vous voyiez ce qui est réellement parti ; celui-là est désactivé tant que
vous ne l'activez pas. L'interface parle 16 langues et suit celle de Discord
tant que vous ne dites pas le contraire.

## Fournisseurs

La clé d'API, c'est vous qui l'apportez, et elle reste la vôtre. Le plugin n'a
pas de serveur à lui et ne voit jamais la clé de quelqu'un d'autre.

| Fournisseur | Offre gratuite |
|---|---|
| Groq | oui |
| Google Gemini | oui |
| Z.ai GLM | oui, et accessible là où les deux autres sont bloqués |
| Anthropic Claude | non |
| Toute API compatible OpenAI | selon le fournisseur |

Un deuxième fournisseur peut être désigné comme secours. Quand le premier est
saturé, à court de quota ou refuse la requête, la traduction passe par l'autre
sans vous déranger avec ça.

Les requêtes partent du processus d'arrière-plan de Discord : votre clé n'entre
donc jamais dans la partie de Discord qu'une page web pourrait atteindre.

## Installation

AI Translate fonctionne à l'intérieur de Vencord, un mod bien connu de
l'application Discord. Une seule commande télécharge Vencord avec AI Translate
déjà dedans, environ un mégaoctet, et le relie à Discord. Rien n'est compilé sur
votre ordinateur et il n'y a rien d'autre à installer. Cela marche avec le
Discord habituel, PTB et Canary, sous Windows, macOS et Linux.

**Windows.** Ouvrez PowerShell (menu Démarrer, tapez « PowerShell ») et collez :

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS et Linux.** Ouvrez le Terminal et collez :

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Choisissez **Install or update** avec les flèches et appuyez sur Entrée. Quand
il demande quel Discord relier, choisissez de la même façon celui que vous
utilisez. Sous Windows, la commande ferme Discord avant de le relier. Sous
Linux, elle peut demander votre mot de passe, car Discord se trouve souvent là
où seul un administrateur peut écrire. Ensuite, quittez Discord complètement, y
compris depuis l'icône de la zone de notification, et relancez-le.

Sur les systèmes Linux atomiques comme Bazzite, Silverblue, Kinoite ou SteamOS,
la même commande fonctionne : elle n'installe rien dans le système, tout
atterrit dans `~/.aiTranslate`. Discord lui-même doit être celui de Flatpak, et
l'installateur accorde alors de lui-même à ce Flatpak l'accès à ces fichiers. Un
Discord intégré à l'image du système avec `rpm-ostree` ne peut généralement pas
être relié, car les dossiers système y sont en lecture seule ; installez plutôt
le Flatpak.

AI Translate est déjà activé. Ouvrez **Paramètres → Vencord → Plugins →
AI Translate**, choisissez un fournisseur et collez votre clé.

Tout ce que la commande télécharge tient dans un dossier à part :
`%LOCALAPPDATA%\aiTranslate` sous Windows et `~/.aiTranslate` sous macOS et
Linux. Relier Discord consiste à remplacer son fichier de démarrage par un petit
fichier qui charge d'abord Vencord puis Discord exactement comme avant ; votre
compte, vos paramètres et vos messages ne sont pas touchés.

## Dans le navigateur

Discord dans un onglet n'a besoin de rien de tout cela : aucun Vencord à
installer, rien à modifier. Le même plugin, Vencord compris, existe aussi en
userscript.

Installez [Tampermonkey](https://www.tampermonkey.net/) ou un autre gestionnaire
de userscripts, puis ouvrez
[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js). Votre
gestionnaire propose de l'installer, puis le tient à jour depuis là. Ouvrez
discord.com et rechargez la page. Si l'extension Vencord Web est installée,
désactivez-la : ce script contient déjà Vencord, et deux dans un même onglet ne
font pas bon ménage.

Ouvrez ensuite **Paramètres → Vencord → Plugins → AI Translate**, choisissez un
fournisseur et collez votre clé, comme dans l'application. La clé est gardée par
le gestionnaire de userscripts, pas par la page, et les requêtes passent aussi
par lui. Pour l'enlever, supprimez le script dans votre gestionnaire.

## Mises à jour

Vous n'avez rien à faire. AI Translate cherche une nouvelle version tout seul
tous les 2 jours, la télécharge en arrière-plan et affiche une notification ;
cliquez dessus et Discord redémarre dans la nouvelle version. Si vous l'ignorez,
la mise à jour s'applique simplement au prochain démarrage de Discord.
**Rechercher les mises à jour**, en bas des paramètres du plugin, fait la même
chose tout de suite.

Chaque nouvelle version emporte aussi le dernier Vencord : les corrections de
Vencord arrivent donc par le même chemin. Sous Windows et Linux, le lien survit
en outre aux mises à jour de Discord lui-même. Si AI Translate venait à
disparaître après une mise à jour de Discord, relancez la commande
d'installation : elle répare l'installation sans perdre vos paramètres.

## Comment les versions sont fabriquées

Vencord n'exécute que les plugins qui ont été compilés dedans : ce que vous
téléchargez, c'est donc Vencord avec AI Translate à l'intérieur. Personne ne le
compile à la main : un robot sur GitHub vérifie toutes les heures, et dès que
Vencord ou AI Translate a une nouvelle version, il compile les deux ensemble à
partir de leurs propres sources et publie le résultat sur
[builds.zolatau.com](https://builds.zolatau.com/), où figurent les sources
exactes dont chaque version est issue.

## Désinstallation

Lancez la même commande que pour l'installation et choisissez **Remove**. Elle
retire le lien de Discord, Discord redevient donc exactement comme avant, puis
elle demande s'il faut aussi supprimer les fichiers téléchargés. Quittez Discord
complètement et relancez-le.

Vos clés d'API et vos paramètres sont rangés avec les paramètres de Vencord, pas
dans les fichiers téléchargés : ils sont donc toujours là si vous réinstallez un
jour.

## Vous compilez déjà Vencord vous-même

Depuis votre dossier Vencord, clonez ce dépôt dedans comme userplugin et
recompilez :

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Les deux lignes sont identiques sous Windows, macOS et Linux, et `git clone` crée
`src/userplugins` s'il n'existe pas encore. Redémarrez Discord ensuite. Cela
marche pareil avec Equicord. Une copie compilée ainsi ne se met pas à jour toute
seule depuis GitHub ; faites `git pull` et recompilez.

## Signaler quelque chose

L'enveloppe en haut de la page des paramètres du plugin ouvre une fenêtre pour
les rapports de bugs et les demandes, captures d'écran comprises. Le serveur
d'entraide est lié dans cette même fenêtre.

## Licence

GPL-3.0-or-later.
