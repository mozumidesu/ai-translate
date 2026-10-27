<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <b>🇧🇷&nbsp;Português</b> ·
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

Um plugin para o Discord que traduz suas mensagens com o modelo de IA que você
escolher, sem achatar o seu jeito de escrever.

As mensagens que você envia são traduzidas antes de sair, conversa por conversa.
As mensagens que você recebe são traduzidas quando você pede, pelo menu do
clique direito.

## Por que mais um tradutor

A tradução automática foi feita para a prosa. Conversa não é prosa. Ela vem em
letras minúsculas e pela metade, se apoia em kaomojis, e um ponto que falta está
dizendo alguma coisa. A maioria dos tradutores arruma tudo isso em silêncio, e
do outro lado chega uma carta padrão escrita por outra pessoa.

Este foi feito para não mexer. Ele não coloca pontuação que você não escreveu,
não passa para maiúscula o que você deixou em minúscula, mantém suas quebras de
linha onde você as colocou, e sabe que um emoticon é um rosto, não uma palavra
para traduzir.

## O que ele faz

A tradução automática é ligada por conversa, então ela só age onde você
realmente precisa. Clique esquerdo no botão de traduzir na barra de digitação
abre o painel; clique direito liga ou desliga a conversa atual.

Qualquer mensagem recebida pode ser traduzida pelo menu do clique direito.
Quando nem a tradução esclarece, por causa de abreviações, de uma palavra que só
se usa em um país ou de uma piada entre duas pessoas, o **AI Explain** nesse
mesmo menu diz qual é o idioma, abre as abreviações e conta o que se quis dizer.

As últimas mensagens da conversa vão junto com cada pedido, então um simples
"sim" ou "não cola" chega do jeito que devia. Você também pode fixar o seu
vocabulário: palavras que nunca podem ser traduzidas, termos presos a uma
tradução fixa, o gênero gramatical a usar para você e se a outra pessoa é
tratada de maneira formal ou não.

Uma mensagem sozinha também pode guardar parte de si. Coloque uma palavra ou
expressão entre duas barras invertidas, `\carpe diem\`, e ela sai exatamente
como você digitou, sem as barras; uma barra invertida no começo da linha guarda
a linha inteira. Código entre crases nunca é traduzido.

Embaixo das suas mensagens enviadas pode ficar o original, visível só para você,
para que você veja o que saiu de verdade; esse fica desligado até você ligar. A
interface fala 16 idiomas e segue o do Discord enquanto você não disser outra
coisa.

## Provedores

A chave de API é sua e continua sendo sua. O plugin não tem servidor próprio e
nunca vê a chave de ninguém.

| Provedor | Plano gratuito |
|---|---|
| Groq | sim |
| Google Gemini | sim |
| Z.ai GLM | sim, e funciona onde os outros dois estão bloqueados |
| Anthropic Claude | não |
| Qualquer API compatível com OpenAI | depende do provedor |

Dá para indicar um segundo provedor como reserva. Quando o primeiro está
sobrecarregado, sem cota ou recusa o pedido, a tradução passa pelo outro sem te
incomodar com isso.

Os pedidos saem do processo de segundo plano do Discord, então sua chave nunca
entra na parte do Discord que uma página da web poderia alcançar.

## Instalação

O AI Translate funciona dentro do Vencord, um mod bem conhecido do aplicativo do
Discord. Um comando baixa o Vencord com o AI Translate já dentro, cerca de um
megabyte, e conecta ao Discord. Nada é compilado no seu computador e não é
preciso instalar mais nada. Funciona com o Discord normal, PTB e Canary no
Windows, macOS e Linux.

**Windows.** Abra o PowerShell (menu Iniciar, digite "PowerShell") e cole:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS e Linux.** Abra o Terminal e cole:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Escolha **Install or update** com as setas e aperte Enter. Quando perguntar qual
Discord conectar, escolha do mesmo jeito o que você usa. No Windows o comando
fecha o Discord antes de conectar. No Linux ele pode pedir sua senha, porque o
Discord costuma ficar onde só um administrador pode gravar. Depois feche o
Discord por completo, inclusive pelo ícone da bandeja, e abra de novo.

Em sistemas Linux atômicos como Bazzite, Silverblue, Kinoite ou SteamOS, o mesmo
comando funciona: ele não instala nada no sistema, tudo vai parar em
`~/.aiTranslate`. O próprio Discord tem que ser o do Flatpak, e aí o instalador
libera sozinho o acesso desse Flatpak a esses arquivos. Um Discord embutido na
imagem do sistema com `rpm-ostree` normalmente não dá para conectar, porque lá
as pastas do sistema são só de leitura; instale o Flatpak no lugar.

O AI Translate já vem ligado. Abra **Configurações → Vencord → Plugins →
AI Translate**, escolha um provedor e cole sua chave.

Tudo o que o comando baixa fica numa pasta só dele:
`%LOCALAPPDATA%\aiTranslate` no Windows e `~/.aiTranslate` no macOS e Linux.
Conectar o Discord quer dizer trocar o arquivo de inicialização dele por um
pequeno que carrega primeiro o Vencord e depois o Discord exatamente como antes;
sua conta, suas configurações e suas mensagens não são tocadas.

## No navegador

O Discord numa aba do navegador não precisa de nada disso: nenhum Vencord para
instalar, nada para alterar. O mesmo plugin, com o Vencord dentro, também existe
como userscript.

Instale o [Tampermonkey](https://www.tampermonkey.net/) ou outro gerenciador de
userscripts e abra em seguida
[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js). Seu
gerenciador oferece instalá-lo e depois o mantém atualizado dali. Abra
discord.com e recarregue a página. Se a extensão Vencord Web estiver instalada,
desligue-a: este script já tem o Vencord dentro, e dois na mesma aba não se dão
bem.

Depois abra **Configurações → Vencord → Plugins → AI Translate**, escolha um
provedor e cole sua chave, igual ao aplicativo. A chave fica com o gerenciador
de userscripts, não com a página, e os pedidos saem por ele também. Para
remover, apague o script no seu gerenciador.

## Atualizações

Você não precisa fazer nada. O AI Translate procura uma versão nova sozinho a
cada 2 dias, baixa em segundo plano e mostra uma notificação; clique nela e o
Discord reinicia já na versão nova. Se você ignorar, a atualização simplesmente
é aplicada na próxima vez que o Discord abrir. **Verificar atualizações**, lá no
fim das configurações do plugin, faz o mesmo na hora.

Cada versão nova traz também o Vencord mais recente, então as correções do
próprio Vencord chegam pelo mesmo caminho. No Windows e no Linux a conexão
sobrevive até às atualizações do próprio Discord. Se o AI Translate sumir depois
de o Discord se atualizar, rode o comando de instalação de novo: ele conserta a
instalação sem perder suas configurações.

## Como as builds são feitas

O Vencord só roda plugins que foram compilados dentro dele, então o que você
baixa é o Vencord com o AI Translate dentro. Ninguém compila isso na mão: um
robô no GitHub confere a cada hora, e sempre que o Vencord ou o AI Translate
ganha uma versão nova, ele compila os dois juntos a partir das fontes deles e
publica o resultado em [builds.zolatau.com](https://builds.zolatau.com/), onde
ficam as fontes exatas de onde cada build saiu.

## Desinstalação

Rode o mesmo comando da instalação e escolha **Remove**. Ele tira a conexão do
Discord, então o Discord volta a ser exatamente como era, e depois pergunta se
os arquivos baixados também devem ser apagados. Feche o Discord por completo e
abra de novo.

Suas chaves de API e configurações ficam junto das configurações do Vencord, não
nos arquivos baixados, então continuam lá se um dia você instalar de novo.

## Já compila o Vencord por conta própria?

Da sua pasta do Vencord, clone este repositório dentro como userplugin e compile
de novo:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

As duas linhas são iguais no Windows, macOS e Linux, e o `git clone` cria
`src/userplugins` se ainda não existir. Reinicie o Discord depois. Com o Equicord
funciona igual. Uma cópia compilada assim não se atualiza sozinha pelo GitHub;
faça `git pull` e compile de novo.

## Relatar alguma coisa

O envelope no topo da página de configurações do plugin abre uma janela para
relatos de erro e pedidos, com capturas de tela. O servidor de suporte está
linkado nessa mesma janela.

## Licença

GPL-3.0-or-later.
