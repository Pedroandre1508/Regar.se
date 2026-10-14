# Floral Selfcare Tracker

Crie uma aplicação web responsiva chamada "Regar", inspirada no conceito de autocuidado diário e cultivo pessoal através de uma metáfora de flores e plantas.

Utilize rigorosamente a seguinte paleta de cores personalizada via Tailwind:
- color-forest: #042608 (Fundo escuro principal)
- color-leaf: #2a5c0b (Verde médio para cartões e detalhes)
- color-olive: #808f12 (Verde oliva para botões secundários)
- color-cream: #fefaef (Creme marfim para superfícies claras e textos em fundos escuros)
- color-tulip: #ea2a15 (Vermelho tulipa para botões de ação principal, destaques e alertas)

Utilize fontes elegantes com serifa para títulos (estilo Playfair Display ou Cormorant Garamond) e sans-serif limpa para textos funcionais.

A aplicação terá 2 tipos de acesso via Supabase Auth:
1. Usuário comum
2. Administrador

Estrutura e Telas a serem implementadas:

1. TELA INICIAL / LOGIN (/login):
- Fundo em color-forest com um ícone floral elegante no topo.
- Título "REGAR" em tipografia clássica, subtítulo "Para florescer, precisa de cuidado e carinho".
- Botão principal "ENTRAR" (color-tulip com texto claro) para acesso do usuário.
- Link discreto no rodapé "Acesso ADM" que abre modal ou tela de login para o Pedro.

2. DASHBOARD DA DANIELY (/dashboard):
- Visual em dois tons (seção superior em color-forest e corpo principal em color-cream).
- Header exibindo: "Olá, Daniely" e um contador visual proeminente: "GOTAS D'ÁGUA: [saldo]".
- Card de Chamada Diária:
  * O formulário só pode ser respondido entre 08:00 e 23:59.
  * Se estiver no horário e ela ainda não respondeu hoje, exibir botão de destaque "Regar meu dia".
  * Se já foi respondido na data de hoje, exibir badge: "Jardim regado hoje! Próxima rega amanhã a partir das 08:00".
  * Se for antes das 08:00, exibir aviso de que a flor está descansando.
- Seção "Canteiro de Recompensas" (Loja de Prêmios):
  * Grid com os prêmios cadastrados pelo ADM, exibindo ícone/imagem, nome e custo em "Gotas".
  * Botão "Resgatar" que valida se o saldo é suficiente, desconta as gotas atomicamente e adiciona ao inventário.
- Seção "Meu Inventário / Colheita":
  * Lista de recompensas já resgatadas com selo de status ("Aguardando miminho" ou "Concluído").

3. TELA DE REGA DIÁRIA (/regar):
- Exibe as perguntas diárias cadastradas pelo ADM em formato de cartões de múltipla escolha.
- Cada pergunta possui alternativas onde cada opção soma ou subtrai Gotas (ex: Opção A: +10 gotas, Opção B: +3 gotas, Opção C: -10 gotas).
- Ao final, calcular o total, somar ao saldo da Daniely, registrar o envio do dia para travar novos acessos até o reset e exibir um resumo animado de pontos ganhos.

4. PAINEL DO ADMINISTRADOR (/admin):
- Acesso restrito via role ou email do Pedro.
- Visor em tempo real do saldo de Gotas da Daniely com botão para ajuste manual caso necessário.
- Aba "Perguntas Diárias":
  * Formulário para cadastrar pergunta e múltiplas opções com suas respectivas pontuações.
  * Lista de perguntas com toggle para Ativar/Desativar e botão de excluir.
- Aba "Recompensas":
  * Cadastrar novos prêmios, definir o valor em Gotas e descrição.
  * Gerenciar resgates feitos pela Daniely e marcar como entregues.

Configure as tabelas correspondentes no Supabase, regras de RLS e garanta transições suaves e design refinado.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
