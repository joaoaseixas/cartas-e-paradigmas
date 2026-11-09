# Cartas & Paradigmas — Saga Galáctica

RPG de cartas por turnos em **3D** (Three.js) com meta-progressão estilo Clash Royale: campanha infinita, roleta de heróis, níveis e cartas desbloqueáveis.
Disponível como **app Android (APK)** e **app de Windows (.exe)**.

> **Aviso:** o tema usa personagens e nomes de Star Wars (marca da Lucasfilm/Disney). É um projeto de estudo para uso pessoal e acadêmico — não é afiliado nem endossado pelos detentores dos direitos e não deve ser publicado em lojas de aplicativos.

Projeto da disciplina de **Paradigmas de Programação**: o código segue o estudo de caso do RPG (POO + SOLID) e mescla os paradigmas estruturado, funcional e lógico (veja a tabela abaixo).

## Baixar e jogar

Na aba **Releases** deste repositório estão os arquivos prontos:

| Plataforma | Arquivo | Como instalar |
|---|---|---|
| Android | `CartasEParadigmas.apk` | Copie para o celular, abra o arquivo e permita "instalar apps desconhecidos". |
| Windows | `CartasEParadigmas-Windows.zip` | Extraia o zip e execute `CartasEParadigmas.exe` (F11 alterna tela cheia). |

O Windows pode exibir o aviso do SmartScreen porque o executável não é assinado: clique em "Mais informações" e "Executar assim mesmo".
O APK é de debug (assinado com a chave de debug do Android), suficiente para uso pessoal.

## O loop do jogo

1. **Jogar**: escolha uma fase da campanha infinita (um setor = 7 fases; a 7ª é chefe) e lute com uma equipe de 3 heróis. Cada setor completo deixa os inimigos mais fortes.
2. **Ganhar**: créditos, fragmentos de herói, 1 giro de roleta por vitória e até 3 estrelas (sem baixas + rápido).
3. **Girar a roleta**: giro grátis por dia + giros ganhos. Cai crédito, fragmento, giros extras ou **herói novo** (Raro, Épico ou Lendário). Garantia de herói a cada 12 giros.
4. **Evoluir**: créditos + fragmentos sobem o herói até o nível 10 (mais vida e ataque) e **desbloqueiam cartas novas por nível**.
5. **Montar a equipe**: 11 heróis (Luke, Han, Leia, Chewbacca, Lando, R2-D2, Obi-Wan, Ahsoka, Mace Windu, Yoda, Boba Fett) e armas equipáveis.

## Combate

- 3 de energia por turno; cada herói tem as próprias cartas, todas num baralho único. Toque na carta e depois no alvo.
- Os ícones sobre os inimigos mostram a intenção do próximo turno.
- **Decepar** destrói o braço do inimigo e corta o dano dele pela metade.
- Elementos (decididos por uma base lógica): íons fritam droides, a luz fere os sombrios, plasma derrete construções.
- Contêineres e portões também são alvos.

## Desenvolvimento

Requisitos: Node.js 20+ (para Android: JDK 21 e Android SDK).

```bash
npm install
npm run serve            # http://localhost:5173  (use o modo celular do navegador)
npm test                 # testes: roleta/garantia/evolução/diário/campanha + simulação do combate
npm run build:desktop    # gera dist/CartasEParadigmas-Windows.zip (Electron)
```

APK Android:

```bash
npm run sync:android
cd android && ./gradlew assembleDebug     # android/app/build/outputs/apk/debug/app-debug.apk
```

> Dica Windows: se o Gradle falhar com "Unable to establish loopback connection", use um `TEMP` curto (ex.: `C:\gtmp`).

## Mapa do PDF para o código

| Conceito do PDF | Onde está |
|---|---|
| `Personagem` abstrata, `Guerreiro`/`Mago`/`Inimigo` | `www/js/domain/entidades.js` |
| `Destrutivel`, `ComHabilidadeEspecial` (ISP) | `www/js/domain/contratos.js` |
| Dano sem `println` (SRP/DIP) | `CombatNotifier` + `OutputChannel` em `domain/notificador.js` |
| i18n (`MessageProvider`, PT/EN) | `www/js/i18n.js` |
| `Bau`, `Fortaleza` (→ `Portao`) | `Cenario`, `Bau`, `Portao` em `entidades.js` |
| Composição `Membro` / Agregação `Arma` | braço do inimigo / armas do perfil (`game/perfil.js`) |
| Zumbi que não morre / Boss com fases (OCP) | `Zumbi`, `Chefe` via gancho `aoZerarVida()` |
| Paradigma funcional | pipeline de dano em `domain/dano.js` |
| Paradigma lógico | `BaseDeConhecimento` com unificação em `domain/logica.js` |
| Paradigma estruturado | loop de turno dos inimigos em `game/batalha.js` |

## Estrutura

```
www/js/domain/   regras puras (sem DOM)
www/js/game/     cartas, mundo, batalha, perfil (meta-progressão), missão
www/js/three/    cena 3D, modelos procedurais e atores
www/js/ui/       hub, roleta, batalha, HUD, efeitos, áudio
android/         projeto Android (Capacitor)
desktop/         app de Windows (Electron)
tests/           testes em Node
```
