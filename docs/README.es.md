<p align="center">
  <img src="banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <b>🇪🇸&nbsp;Español</b> ·
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

Un plugin para Discord que traduce tus mensajes con el modelo de IA que elijas,
y lo hace sin aplanar tu manera de escribir.

Los mensajes que envías se traducen antes de salir, chat por chat. Los mensajes
que recibes se traducen cuando tú lo pides, desde el menú del clic derecho.

## Por qué otro traductor

La traducción automática está hecha para la prosa. Un chat no es prosa. Va en
minúsculas y a medias, se sostiene sobre kaomojis, y un punto que falta está
diciendo algo. La mayoría de los traductores ordenan todo eso sin avisar, y al
otro lado llega una carta modelo escrita por otra persona.

Este está hecho para no tocarlo. No pone puntuación que tú no escribiste, no
pasa a mayúscula lo que dejaste en minúscula, conserva tus saltos de línea donde
los pusiste, y sabe que un emoticono es una cara y no una palabra que traducir.

## Qué sabe hacer

La traducción automática se activa por chat, así que solo actúa en las
conversaciones donde de verdad hace falta. Clic izquierdo en el botón de
traducir de la barra de escritura abre el panel; clic derecho activa o desactiva
el chat actual.

Cualquier mensaje que recibas se puede traducir desde el menú del clic derecho.
Cuando ni la traducción aclara nada, por abreviaturas, por una palabra que solo
se usa en un país o por una broma entre dos, **AI Explain** en ese mismo menú
nombra el idioma, desarrolla las abreviaturas y dice qué se quiso decir.

Los últimos mensajes de la conversación viajan con cada petición, así un simple
«sí» o «no se pega» llega como debía llegar. También puedes fijar tu propio
vocabulario: palabras que nunca deben traducirse, términos atados a una
traducción fija, el género gramatical que usar para ti y si se trata a la otra
persona de tú o de usted.

Un mensaje suelto también puede conservar una parte de sí mismo. Pon una palabra
o una frase entre dos barras invertidas, `\carpe diem\`, y sale exactamente como
la escribiste, sin las barras; una barra invertida al principio de una línea
conserva la línea entera. El código entre comillas invertidas no se traduce
nunca.

Debajo de tus mensajes enviados puede quedar el original, visible solo para ti,
para que veas qué salió en realidad; eso está apagado hasta que lo enciendas. La
interfaz habla 16 idiomas y sigue el de Discord mientras no le digas otra cosa.

## Proveedores

La clave de API la pones tú, y sigue siendo tuya. El plugin no tiene servidor
propio y nunca ve la clave de nadie.

| Proveedor | Plan gratuito |
|---|---|
| Groq | sí |
| Google Gemini | sí |
| Z.ai GLM | sí, y funciona donde los otros dos están bloqueados |
| Anthropic Claude | no |
| Cualquier API compatible con OpenAI | depende del proveedor |

Se puede nombrar un segundo proveedor como reserva. Cuando el primero está
saturado, sin cuota o rechaza la petición, la traducción pasa por el otro sin
molestarte con ello.

Las peticiones salen del proceso en segundo plano de Discord, así que tu clave
nunca entra en la parte de Discord a la que podría llegar una página web.

## Instalación

AI Translate funciona dentro de Vencord, un mod muy conocido para la aplicación
de Discord. Un comando descarga Vencord con AI Translate ya dentro, cosa de un
megabyte, y lo conecta a Discord. En tu ordenador no se compila nada y no hay
que instalar nada más. Funciona con el Discord normal, PTB y Canary en Windows,
macOS y Linux.

**Windows.** Abre PowerShell (menú Inicio, escribe «PowerShell») y pega:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS y Linux.** Abre la Terminal y pega:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Elige **Install or update** con las flechas y pulsa Enter. Cuando pregunte qué
Discord conectar, elige igual el que usas. En Windows el comando cierra Discord
antes de conectarlo. En Linux puede pedirte la contraseña, porque Discord suele
estar donde solo un administrador puede escribir. Después cierra Discord del
todo, también desde el icono de la bandeja, y ábrelo otra vez.

En sistemas Linux atómicos como Bazzite, Silverblue, Kinoite o SteamOS funciona
el mismo comando: no instala nada en el sistema, todo acaba en `~/.aiTranslate`.
El propio Discord debe ser el de Flatpak, y entonces el instalador le concede a
ese Flatpak el acceso a esos archivos por su cuenta. Un Discord metido en la
imagen del sistema con `rpm-ostree` normalmente no se puede conectar, porque
allí las carpetas del sistema son de solo lectura; instala el Flatpak en su
lugar.

AI Translate ya viene activado. Abre **Ajustes → Vencord → Plugins →
AI Translate**, elige un proveedor y pega tu clave.

Todo lo que descarga el comando vive en una carpeta propia:
`%LOCALAPPDATA%\aiTranslate` en Windows y `~/.aiTranslate` en macOS y Linux.
Conectar Discord significa cambiar su archivo de arranque por uno pequeño que
carga primero Vencord y luego Discord exactamente como antes; tu cuenta, tus
ajustes y tus mensajes no se tocan.

## En el navegador

Discord en una pestaña del navegador no necesita nada de lo anterior: ningún
Vencord que instalar, nada que parchear. El mismo plugin, con Vencord dentro,
también existe como userscript.

Instala [Tampermonkey](https://www.tampermonkey.net/) u otro gestor de
userscripts y abre luego
[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js). Tu
gestor se ofrecerá a instalarlo y después lo mantendrá al día desde allí. Abre
discord.com y recarga la página. Si tienes la extensión Vencord Web,
desactívala: este script ya lleva Vencord dentro, y dos en una misma pestaña no
se llevan bien.

Después abre **Ajustes → Vencord → Plugins → AI Translate**, elige un proveedor
y pega tu clave, igual que en la aplicación. La clave la guarda el gestor de
userscripts, no la página, y las peticiones salen también por él. Para quitarlo,
borra el script en tu gestor.

## Actualizaciones

No tienes que hacer nada. AI Translate busca una versión nueva por su cuenta
cada 2 días, la descarga en segundo plano y muestra un aviso; pulsa en él y
Discord se reinicia ya con la versión nueva. Si lo ignoras, la actualización se
aplica sin más la próxima vez que abras Discord. **Buscar actualizaciones**, al
final de los ajustes del plugin, hace lo mismo al momento.

Cada versión nueva trae también el Vencord más reciente, así que las
correcciones del propio Vencord llegan por el mismo camino. En Windows y Linux
la conexión sobrevive además a las actualizaciones del propio Discord. Si AI
Translate llegara a desaparecer después de que Discord se actualizara, ejecuta
otra vez el comando de instalación: repara la instalación sin perder tus
ajustes.

## Cómo se hacen las compilaciones

Vencord solo ejecuta plugins que fueron compilados dentro de él, así que lo que
descargas es Vencord con AI Translate dentro. Nadie lo compila a mano: un robot
en GitHub comprueba cada hora, y en cuanto Vencord o AI Translate tiene una
versión nueva, compila los dos juntos a partir de sus propias fuentes y publica
el resultado en [builds.zolatau.com](https://builds.zolatau.com/), donde están
las fuentes exactas con las que se compiló cada versión.

## Desinstalación

Ejecuta el mismo comando que para instalar y elige **Remove**. Le quita la
conexión a Discord, así que Discord vuelve a estar exactamente como estaba, y
luego pregunta si borrar también los archivos descargados. Cierra Discord del
todo y ábrelo otra vez.

Tus claves de API y tus ajustes se guardan con los ajustes de Vencord, no en los
archivos descargados, así que siguen ahí si algún día vuelves a instalarlo.

## ¿Ya compilas Vencord tú mismo?

Desde tu carpeta de Vencord, clona este repositorio dentro como userplugin y
vuelve a compilar:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Las dos líneas son iguales en Windows, macOS y Linux, y `git clone` crea
`src/userplugins` si todavía no existe. Después reinicia Discord. Con Equicord
funciona igual. Una copia compilada así no se actualiza sola desde GitHub; haz
`git pull` y compila de nuevo.

## Contar algo

El sobre de arriba en la página de ajustes del plugin abre una ventana para
informar de fallos y pedir cosas, con capturas incluidas. El servidor de soporte
está enlazado en esa misma ventana.

## Licencia

GPL-3.0-or-later.
