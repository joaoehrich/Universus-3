# Upload de PDF — Universus

Como o professor transforma um PDF em perguntas do quiz, o que cada modo exige do
arquivo e onde cada regra vive no código.

- **Componente:** `src/components/UploadPdf.jsx` (usado em `CriarQuizPage`)
- **Modo "importar":** `src/lib/questoesPdf.js` — roda no navegador, sem rede
- **Modo "ia":** `src/lib/gerarQuestoes.js` → `supabase/functions/gerar-questoes/index.ts` → Google Gemini
- **Checagem comum:** `src/lib/arquivoPdf.js`

---

## 1. Os dois modos

A tela oferece dois caminhos, e a escolha depende **do que o arquivo é** — não de
qual resultado o professor quer.

| | **Questões prontas no PDF** (`importar`) | **Gerar com IA** (`ia`) |
|---|---|---|
| O arquivo é | uma prova, lista de exercícios, simulado | material de estudo: apostila, slide, resumo, capítulo |
| Quem escreve as perguntas | ninguém — elas já existem, só são lidas | o Gemini, a partir do conteúdo |
| Onde processa | no navegador do professor (pdf.js) | Edge Function do Supabase → API do Gemini |
| O arquivo sai da máquina | **não** | **sim** |
| Precisa de internet | não | sim |
| Precisa de camada de texto | **sim** | não — página escaneada funciona |
| Tamanho máximo | 20 MB | 10 MB |
| Nº de perguntas | quantas o PDF tiver (o quiz corta em 10) | o professor escolhe: 3, 5, 8 ou 10 |
| Alternativas por questão | 2 a 5, como estiverem no arquivo | sempre 5 |
| Gabarito | precisa estar no arquivo | o Gemini define |
| Custo | zero | consome cota gratuita do Gemini |

> **Regra prática:** se o PDF **já tem perguntas numeradas**, use *importar* — é
> instantâneo, gratuito e não manda o arquivo para lugar nenhum. Se ele é
> **texto corrido**, use *IA*.

---

## 2. Requisitos que valem para os dois modos

Verificados em três camadas, nesta ordem:

**1. `accept="application/pdf,.pdf"`** (`UploadPdf.jsx:242`)
Só filtra o diálogo do sistema operacional. Não valida nada — o usuário pode
escolher "todos os arquivos" e mandar o que quiser.

**2. `validarPdf(arquivo)`** — síncrona, roda no instante da seleção
- `arquivo.type === "application/pdf"`
- `arquivo.size` dentro do limite do modo (20 MB ou 10 MB)

**3. `conferirAssinaturaPdf(arquivo)`** (`src/lib/arquivoPdf.js`) — assíncrona
Lê os primeiros 1024 bytes e procura a assinatura `%PDF-`. É necessária porque
`File.type` vem da **extensão do nome**, não do conteúdo: um `.zip` renomeado
para `.pdf` passa na etapa 2 sem problema.

Ao trocar de modo com um arquivo já selecionado, as três checagens rodam de novo
(`trocarModo`) — os limites de tamanho diferem, então um arquivo aceito num modo
pode ser recusado no outro.

**O que não é aceito em modo nenhum:** DOCX, PPTX, ODT, TXT, imagem solta (JPG,
PNG), ZIP, PDF protegido por senha.

---

## 3. Modo "Questões prontas no PDF"

O parser (`parsearQuestoes`, `src/lib/questoesPdf.js:170`) é uma função pura que
lê texto e devolve questões estruturadas. Ele não adivinha nada: ou o padrão
bate, ou a linha é descartada com um aviso na tela.

### 3.1 Exigência de base: camada de texto

O pdf.js extrai o texto que está **dentro** do PDF. Se o arquivo for uma
digitalização (foto de prova, scanner sem OCR), não há texto para extrair e o
professor recebe:

> *"Não consegui ler texto neste PDF. Se ele for digitalizado (imagem), será
> preciso um PDF com texto de verdade."*

Teste rápido: abra o PDF e tente **selecionar uma palavra com o mouse**. Se não
der para selecionar, é imagem — use o modo IA.

### 3.2 Formato de uma questão

```
1. Qual é a capital do Brasil?
a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador
e) Belo Horizonte
Resposta: C
```

**Enunciado** — precisa começar com número seguido de pontuação:

| Aceito | Não aceito |
|---|---|
| `1.` `2)` `03 -` `4:` | `1` (sem pontuação) |
| `Questão 5.` `QUESTAO 6)` | `Q5.` `Pergunta 7.` |
| `1 — Qual é...` (travessão) | `#1` `[1]` |

O número vai de 1 a 3 dígitos. O enunciado pode ocupar várias linhas — tudo o
que vier depois é anexado até aparecer a primeira alternativa.

**Alternativas** — letra de `a` a `e`, com pontuação obrigatória depois:

| Aceito | Não aceito |
|---|---|
| `a) texto` `(A) texto` | `a texto` (sem pontuação) |
| `b. texto` `c - texto` `d: texto` | `1) texto` (número) |
| | `f) texto` (passa de E) |

A pontuação é obrigatória para não confundir uma frase como *"A prova começa às
8h"* com a alternativa A.

Regras rígidas:
- **Ordem alfabética sem pular letra.** `a, b, c` funciona; `a, b, d` faz o `d`
  ser ignorado, porque só a próxima letra da sequência é aceita.
- **Mínimo 2, máximo 5.** Questão com 1 alternativa é descartada com aviso.
- Alternativas na **mesma linha** (`a) Sim b) Não c) Talvez`) são separadas
  automaticamente — desde que sejam ao menos duas e estejam em sequência.

### 3.3 As três formas de marcar a resposta correta

O parser reconhece três, e em caso de conflito vale a primeira desta lista:

**1. Linha `Resposta:` logo abaixo da questão** *(prioridade máxima)*

```
Resposta: C
Gabarito - B
Resposta correta: (D)
Alternativa certa: A
R: E
```

Precisa ser a **linha inteira**, sem texto em volta.

**2. Marca na própria alternativa**

```
c) Brasília *          →  asterisco no fim
*c) Brasília           →  asterisco no começo
c) Brasília (X)        →  (X) no fim
```

A marca é removida do texto antes de a alternativa ir para o quiz.

**3. Bloco de gabarito no fim do arquivo**

```
GABARITO

1-C   2-A   3-B   4-E   5-D
```

O cabeçalho precisa estar **sozinho na linha** e ser um destes: `GABARITO`,
`RESPOSTAS`, `CHAVE DE RESPOSTAS`, `GABARITO OFICIAL` (maiúsculas ou não, com
`:` opcional). Os pares aceitam `1-C`, `1) C`, `01: B`, `1 C`.

Tudo o que vier depois do cabeçalho sai do corpo e vira só gabarito. Se nenhum
par for reconhecido, o cabeçalho é tratado como falso alarme e o texto continua
sendo lido normalmente.

### 3.4 O que é ignorado de propósito

- Números de página soltos, `Página 3`, `3 de 12` — removidos como rodapé
- Capa, instruções e cabeçalho antes da primeira questão numerada
- Números dentro do enunciado (*"em 1500, o Brasil..."*) não cortam a questão,
  desde que a questão atual ainda não tenha alternativas

### 3.5 Avisos que o professor pode receber

| Aviso | O que fazer |
|---|---|
| *"Questão N ignorada: enunciado vazio"* | O número existe mas o texto não foi lido — provavelmente coluna ou tabela |
| *"Questão N ignorada: encontrei X alternativa(s), o mínimo é 2"* | Alternativas fora de ordem ou sem pontuação depois da letra |
| *"Questão N: o gabarito aponta a letra E, que não existe entre as alternativas lidas"* | Gabarito e questão não batem — a resposta é zerada e o professor escolhe |
| *"Questão N: não achei a resposta correta — marque manualmente"* | A questão entra no quiz, mas sem gabarito |
| *"Nenhuma questão reconhecida"* | O PDF não segue nenhum dos padrões desta seção |

Questão sem resposta identificada **não é descartada**: ela entra no formulário
com o gabarito em branco para o professor marcar.

### 3.6 Exemplo completo de PDF válido

```
PROVA DE GEOGRAFIA — 2º BIMESTRE
Professor: João Silva

1. Qual é a capital do Brasil?
a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador
e) Belo Horizonte

2) Qual o maior bioma brasileiro em extensão territorial,
ocupando cerca de 49% do país?
(A) Cerrado
(B) Amazônia
(C) Mata Atlântica
(D) Caatinga

Questão 3 - O rio São Francisco nasce em qual estado?
a. Bahia
b. Minas Gerais *
c. Pernambuco
d. Alagoas

GABARITO
1-C  2-B
```

Resultado: 3 questões. A 1 e a 2 pegam o gabarito do bloco final, a 3 pega do
asterisco. A questão 2 entra com 4 alternativas — o formulário aceita.

---

## 4. Modo "Gerar com IA"

### 4.1 Como o arquivo chega ao Gemini

1. `lerComoBase64` converte o PDF com `FileReader.readAsDataURL` e corta o
   prefixo `data:application/pdf;base64,`. **O arquivo cresce ~33% aqui**: 10 MB
   viram ~13,4 MB de string JSON.
2. `supabase.functions.invoke("gerar-questoes")` envia com `timeout: 120_000`.
3. A Edge Function revalida o tamanho pelo próprio base64 (`length * 3 / 4`) —
   o front é burlável, o servidor não pode confiar nele.
4. O PDF vai ao Gemini como `inline_data` com `mime_type: "application/pdf"`,
   junto do prompt de instruções.
5. `responseSchema` obriga a resposta a voltar como
   `{ questoes: [{ pergunta, alternativas, correta }] }`.
6. `ehQuestaoValida` descarta qualquer questão fora do formato antes de devolver.

### 4.2 O que o arquivo precisa ter

**Conteúdo, não perguntas.** O prompt manda *"Use somente informações presentes
no documento. Não invente dados."* — a qualidade das perguntas é a qualidade do
material. Um PDF com 3 parágrafos não sustenta 10 perguntas distintas, porque o
prompt também pede *"Não repita o mesmo assunto em duas questões."*

**Serve bem:** apostila, capítulo de livro, resumo, artigo, slides com texto,
material didático, transcrição de aula.

**Serve mal:** índice, sumário, lista de referências, planilha de notas, PDF só
com imagens sem legenda, ficha com pouco texto.

**PDF escaneado funciona.** Esta é a diferença prática mais importante em relação
ao modo importar: o Gemini processa cada página como imagem, então uma
digitalização legível dá certo. Não está dito na interface, mas é justamente o
caso em que o professor deve escolher IA.

### 4.3 Limites do Gemini (não checados pelo nosso código)

| Limite | Valor | O que acontece ao estourar |
|---|---|---|
| Payload com `inline_data` | ~20 MB no total da requisição | Nossos 10 MB → ~13,4 MB: cabe, com pouca folga |
| Páginas por PDF | ~1000 | Erro 400 vindo da API |
| Custo em tokens | ~258 tokens por página | Cota gratuita acaba mais rápido |
| Requisições no plano gratuito | cota diária/por minuto | **429** → mensagem repassada ao professor |
| Filtro de conteúdo | — | **422** *"O conteúdo do PDF foi bloqueado pelos filtros do Gemini"* |

Um PDF de 300 páginas cabe nos 10 MB e consome ~77 mil tokens de uma vez.
Tecnicamente funciona; na prática esgota a cota gratuita depressa e demora.
Recortar o capítulo relevante dá perguntas melhores e mais rápidas.

### 4.4 Os dois timeouts

Encadeados de propósito, o de dentro mais curto que o de fora:

| Camada | Limite | Resposta |
|---|---|---|
| Edge Function → Gemini | 90 s (`AbortSignal.timeout`) | **504** *"O Gemini passou de 90 segundos sem responder..."* |
| Navegador → Edge Function | 120 s (`timeout` do `invoke`) | *"A geração passou de 2 minutos e foi cancelada..."* |

Os 90 s ficam abaixo dos 120 s para que a Edge Function consiga **responder com
uma explicação** antes de o cliente desistir. Sem eles, um PDF grande fazia a
função bater no teto da plataforma, que derruba a conexão sem corpo de resposta
— e o botão ficava em *"Gerando..."* indefinidamente.

### 4.5 Erros possíveis e o que significam

| Mensagem | Origem | Causa |
|---|---|---|
| *"A função 'gerar-questoes' não está publicada no Supabase"* | front | 404 — falta `supabase functions deploy` |
| *"Não foi possível chamar a função... verifique se ela está publicada"* | front | Preflight CORS falhou: função ausente ou usuário offline |
| *"Sem permissão para chamar a função"* | front | 401/403 — sessão expirada |
| *"GEMINI_API_KEY não configurada"* | Edge Function | Falta o secret em *Project Settings → Edge Functions → Secrets* |
| *"PDF maior que 10 MB"* | Edge Function | 413 — front burlado |
| *"O conteúdo do PDF foi bloqueado pelos filtros do Gemini"* | Edge Function | 422 — `promptFeedback.blockReason` |
| *"Não foi possível gerar questões a partir deste PDF"* | Edge Function | 422 — o modelo respondeu, mas nada passou em `ehQuestaoValida` |
| *"A IA não retornou questões"* | Edge Function | 502 — resposta sem `parts[0].text` |
| *"...is no longer available to new users"* | API do Gemini (repassada) | 502 — o nome em `MODELO` foi aposentado; ver §6 |
| *"A geração passou de 2 minutos e foi cancelada"* | front | Timeout do `invoke` |

---

## 5. Depois da leitura: o que os dois modos entregam

Formato idêntico, consumido por `onQuestoesGeradas` em `CriarQuizPage`:

```js
{
  pergunta: "Qual é a capital do Brasil?",
  alternativas: ["São Paulo", "Rio de Janeiro", "Brasília"],
  correta: 2   // índice na lista; null quando o modo importar não achou o gabarito
}
```

O quiz aceita **no máximo 10 perguntas**. Se o PDF trouxer mais, o excedente é
descartado e a tela avisa: *"7 de 15 questões importadas do PDF (o quiz aceita no
máximo 10)."* Com o quiz cheio, o input é desabilitado.

---

## 6. Configuração necessária

Só o modo IA precisa de configuração. O modo importar funciona de fábrica.

1. Chave gratuita em <https://aistudio.google.com/>
2. Supabase → *Project Settings → Edge Functions → Secrets* → `GEMINI_API_KEY`
3. `supabase functions deploy gerar-questoes`

Modelo em uso: `gemini-3.6-flash` (constante `MODELO`, `index.ts:19`). O secret
opcional `GEMINI_MODELO` tem prioridade sobre ela — trocar de modelo é editar
esse secret, sem redeploy.

Nomes de modelo envelhecem: o `gemini-2.5-flash`, usado até 2026-08, passou a
responder *"is no longer available to new users"* para chaves criadas depois de
ele ser fechado a projetos novos. A lista atual fica em
<https://ai.google.dev/gemini-api/docs/models>; para ver o que a **sua** chave
enxerga:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=SUA_CHAVE" \
  | grep '"name"'
```

---

## 7. Arquivos

| Arquivo | Papel |
|---|---|
| `src/components/UploadPdf.jsx` | Tela: escolha do modo, input, validação na seleção, mensagens |
| `src/lib/arquivoPdf.js` | `conferirAssinaturaPdf` — usada pelos dois modos |
| `src/lib/questoesPdf.js` | Modo importar: parser puro + leitura via pdf.js |
| `src/lib/gerarQuestoes.js` | Modo IA: base64, `invoke` com timeout, tradução dos erros |
| `supabase/functions/gerar-questoes/index.ts` | Prompt, chamada ao Gemini, schema, validação da saída |
