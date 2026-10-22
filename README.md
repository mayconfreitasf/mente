# Jingar

App de relacionamento em que você sobe de nível respondendo quizzes e desbloqueia pessoas do mesmo nível. Protótipo (versão 1): os outros perfis são fictícios e o progresso fica salvo no navegador.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro (telas, quiz, perfis, chat) |
| `perguntas.js` | Perguntas do modo Normal (21 assuntos) |
| `dificeis.js` | Perguntas do modo Dobro nível |
| `api/perguntas.js` | Função de servidor que cria o "Quiz do seu arquivo" com o Claude |
| `build.js` | Monta a pasta `dist/` publicada pela Vercel |

## Publicar na Vercel

### 1. Chave da API do Claude
O quiz do arquivo usa a sua conta na **API** do Claude (não a assinatura do claude.ai).

1. Entre em <https://console.anthropic.com> e crie uma chave em **API Keys**.
2. Em **Billing**, coloque crédito e defina um **limite de gasto mensal**. Isso evita surpresas se muita gente usar.

### 2. GitHub
Crie um repositório vazio (de preferência privado) chamado `mente` em <https://github.com/new> e envie esta pasta:

```bash
git remote add origin https://github.com/SEU-USUARIO/mente.git
git push -u origin main
```

### 3. Vercel
1. Em <https://vercel.com/new>, importe o repositório `mente`.
2. Em **Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY`: a chave criada no passo 1 (obrigatória).
   - `CODIGO_ACESSO`: uma senha que você passa para quem pode usar o quiz do arquivo (recomendado; sem ela, qualquer pessoa com o link gasta seus créditos).
   - `MODELO` (opcional): o modelo do Claude. Padrão `claude-opus-5-5`. Para gastar bem menos, use `claude-haiku-5-5`.
3. Clique em **Deploy**. A cada `git push` a Vercel publica de novo sozinha.

### 4. No iPhone
Abra o link da Vercel no Safari e toque em **Compartilhar → Adicionar à Tela de Início**.

## Custos
Cada vez que alguém anexa um arquivo, o servidor faz um pedido à API do Claude cobrado na sua conta. Um PDF de 20 páginas no `claude-opus-5-5` custa na faixa de US$ 0,10 por leva de 20 perguntas; no `claude-haiku-5-5`, menos de US$ 0,01. Os pedidos de "mais perguntas" do mesmo arquivo reaproveitam o conteúdo em cache e saem mais baratos.

## Limites atuais
- Os perfis são fictícios e o progresso fica só no navegador de cada pessoa.
- O PDF é lido no próprio celular; PDFs que são só imagem escaneada não funcionam.
- O corpo enviado à Vercel tem limite de 4,5 MB, por isso o texto é cortado em 40 mil caracteres.
