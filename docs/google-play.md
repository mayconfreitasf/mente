# Publicar o Jingar no Google Play

Roteiro só do Android, na ordem em que o Play Console pede. A parte de gerar o `.aab` no Codemagic está em
[publicar-app.md](publicar-app.md) (seções 3 e 4). Imagens prontas da ficha em [google-play/](google-play/).

## 1. Conta e app

1. Crie a conta em play.google.com/console (US$ 25, uma vez) e faça a verificação de identidade.
   - **Conta pessoal** criada depois de nov/2023: antes da produção, o Google exige um **teste fechado com 12 testadores
     inscritos por 14 dias seguidos** (seção 5).
   - **Conta de organização** (CNPJ + número D-U-N-S, gratuito): não tem essa exigência.
2. Criar app → Nome **Jingar** · Idioma padrão **Português (Brasil)** · **App** · **Gratuito**.
3. Aceite o **Play App Signing**: o Google guarda a chave final e a `jingar_keystore` do Codemagic vira a chave de upload.
   Guarde uma cópia dela e das senhas mesmo assim.

## 2. Ficha da loja (Crescimento → Presença na loja → Versão principal)

- **Nome do app:** Jingar
- **Descrição curta** (até 80 caracteres):

```
Responda quizzes, suba de nível e conheça gente perto de você.
```

- **Descrição completa:**

```
O Jingar junta quiz e paquera. Quanto mais você joga, mais pessoas conhece.

• Quizzes de vários assuntos, em três níveis de dificuldade.
• Crie seu próprio quiz a partir de um arquivo (PDF, texto ou foto) ou de um tema.
• Cada acerto sobe o seu nível. Níveis mais altos liberam mais perfis no Descobrir.
• Veja pessoas perto de você. Sua localização nunca aparece para ninguém: os outros veem só a distância aproximada.
• Curtiu e foi curtido? Deu match. Converse no chat e mande desafios.
• Desafie amigos por link e dispute o ranking.

Segurança em primeiro lugar: fotos de perfil passam por moderação automática, e você pode denunciar e bloquear
qualquer perfil a qualquer momento. Excluir a conta é simples e fica no próprio app.

O Jingar é só para maiores de 18 anos.
```

- **Ícone:** `docs/google-play/icone-512.png` (512×512)
- **Imagem de destaque:** `docs/google-play/destaque-1024x500.png` (1024×500)
- **Capturas de tela do celular:** de 2 a 8, em pé (por exemplo 1080×1920). Tire no próprio celular com a conta de revisão:
  Quiz, resultado com nível subindo, Descobrir, perfil, match e chat. Não use fotos de usuários reais.
- **Categoria:** Encontros (Dating) · **E-mail de contato:** o mesmo do `CONTATO_EMAIL` · **Site:** https://jingar.com.br

## 3. Conteúdo do app (Política → Conteúdo do app)

| Item | Resposta |
|---|---|
| Política de Privacidade | `https://jingar.com.br/privacidade.html` |
| Acesso ao app | Restrito. Conta de revisão `revisao` e instruções conforme [revisao-lojas.md](revisao-lojas.md) |
| Anúncios | Não, o app não tem anúncios |
| Classificação de conteúdo | Questionário IARC, categoria "Rede social, comunicação ou encontros". Sim para: usuários interagem entre si, compartilham conteúdo, localização aproximada é usada (só a distância aparece). Resultado esperado: 18+ |
| Público-alvo | Somente **18 anos ou mais** |
| Apps de notícias / governamentais / saúde / financeiros | Não |
| Exclusão de conta | No app (Perfil → Excluir conta) e na web: `https://jingar.com.br/excluir-conta.html` |
| Permissões | Localização (Descobrir e matches, só com o app aberto), câmera (foto do perfil), notificações (avisos de match e mensagem). Não pede localização em segundo plano |

## 4. Segurança dos dados

Respostas gerais: **coleta dados: sim** · **criptografados em trânsito: sim** · **pessoa pode pedir exclusão: sim** ·
**compartilha com terceiros: não** (Vercel, Neon, Anthropic, Firebase, e-mail e SMS são prestadores que processam
em nome do Jingar, o que o Google não conta como compartilhamento).

| Tipo de dado | Obrigatório? | Para quê |
|---|---|---|
| Localização aproximada e precisa | Obrigatória para o Descobrir | Funcionalidade do app |
| Nome, e-mail, número de telefone, IDs do usuário | Obrigatórios (e-mail **ou** celular) | Funcionalidade, gerenciamento da conta, segurança |
| Orientação sexual | Obrigatória para o match (com consentimento) | Funcionalidade do app |
| Outras informações pessoais (data de nascimento, cidade, "sobre você") | Obrigatórias | Funcionalidade, segurança (18+) |
| Fotos | Obrigatórias para o perfil | Funcionalidade, segurança (moderação) |
| Outras mensagens no app | Opcional | Funcionalidade do app |
| Arquivos e documentos | Opcional (criar quiz por arquivo) | Funcionalidade do app |
| Interações no app, outro conteúdo gerado pelo usuário | Obrigatório | Funcionalidade do app |
| IDs do dispositivo ou outros IDs (token de notificação) | Opcional | Funcionalidade (notificações) |

## 5. Testes e produção

1. **Teste interno:** Testar e lançar → Teste → Teste interno → criar versão → envie o `.aab` do Codemagic. Adicione o seu
   Gmail na lista de testadores, abra o link de participação no celular e instale pela Play Store. Confira o login, as
   notificações, a câmera e a localização.
2. **Teste fechado** (obrigatório para conta pessoal): crie uma faixa de teste fechado, promova a mesma versão e adicione
   **pelo menos 12 Gmails**. Cada pessoa precisa aceitar o convite pelo link e instalar o app. Conte **14 dias seguidos**
   com 12 ou mais inscritos.
3. **Acesso à produção:** depois dos 14 dias, vá em Painel → Solicitar acesso à produção e responda às perguntas sobre o teste.
4. **Produção:** crie a versão de produção com o `.aab` (para cada build nova, o Codemagic já aumenta o `versionCode`),
   escolha Brasil (ou todos os países) e envie para revisão. Costuma levar de alguns dias a uma semana.

## Observações

- No app, os botões "Continuar com Google/Apple" ficam escondidos: esses logins pela web não abrem dentro do WebView.
  No app, o login é por e-mail ou celular.
- Se o Google reprovar, o motivo chega por e-mail e aparece em Painel → Status da publicação. Corrija e envie uma build nova.
