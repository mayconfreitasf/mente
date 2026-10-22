# Publicar o Jingar na App Store e no Google Play

O app de iPhone e Android é o mesmo código do site, empacotado com o Capacitor (pastas `ios/` e `android/`).
As telas vão dentro do app; o servidor continua na Vercel. Identificador do app: `br.com.jingar.app`.

## 1. Antes de tudo

1. Registre o domínio **jingar.com.br** no registro.br e ligue-o ao projeto na Vercel (Settings → Domains).
2. Na Vercel, confira as variáveis do [docs/app-store.md](app-store.md) (banco, envio de códigos, `CONTATO_EMAIL`, `ADMIN_TOKEN`).
3. O endereço do site (por exemplo `https://jingar.com.br`) é o **API_URL** do app. Sem ele, o app não acha o servidor.

## 2. Contas que só você pode criar

| Conta | Para quê | Custo |
|---|---|---|
| Apple Developer Program | Publicar no iPhone | US$ 99 por ano |
| Google Play Console | Publicar no Android | US$ 25, uma vez |
| Firebase (console.firebase.google.com) | Notificações push no Android | Gratuito |
| Codemagic (codemagic.io) | Gerar os apps na nuvem, sem Mac | Plano gratuito com minutos por mês |

## 3. Notificações push

**Android (Firebase)**
1. No Firebase, crie um projeto e adicione um app Android com o pacote `br.com.jingar.app`.
2. Baixe o `google-services.json` e coloque em `android/app/google-services.json`.
3. Em Configurações do projeto → Contas de serviço, gere uma chave privada (arquivo JSON).
4. Na Vercel, crie a variável `FIREBASE_SERVICE_ACCOUNT` com **todo o conteúdo** desse JSON.

**iPhone (Apple)**
1. No site da Apple Developer, em Certificates, IDs & Profiles → Identifiers, crie o App ID `br.com.jingar.app` com **Push Notifications** marcado.
2. Em Keys, crie uma chave com **Apple Push Notifications service (APNs)** e baixe o arquivo `.p8`.
3. Na Vercel, crie:
   - `APNS_KEY`: o conteúdo do `.p8` (com as linhas `-----BEGIN PRIVATE KEY-----`);
   - `APNS_KEY_ID`: o ID da chave;
   - `APNS_TEAM_ID`: o Team ID da sua conta;
   - `APNS_PRODUCAO`: `1` (TestFlight e App Store usam o ambiente de produção).

Sem essas variáveis o app funciona normalmente, só não envia avisos de match e mensagem.

## 4. Gerar os apps no Codemagic

1. Entre no Codemagic com o GitHub e adicione o repositório `mente`. Ele lê o arquivo `codemagic.yaml`.
2. Em **Environment variables**, crie o grupo `jingar` com `API_URL` = endereço do site.
3. **Android:** em Code signing identities → Android keystores, gere uma chave nova com o nome `jingar_keystore`. **Guarde uma cópia dela e das senhas**: sem a mesma chave, você não consegue atualizar o app no Google Play.
4. **iPhone:** em Integrations → Developer Portal, ligue uma chave da API do App Store Connect com o nome `Jingar`. Em Code signing identities → iOS, deixe o Codemagic criar o certificado e o perfil `app_store` para `br.com.jingar.app`.
5. Rode o workflow **Jingar Android** (gera o `.aab`) e o **Jingar iPhone** (gera o `.ipa` e envia ao TestFlight).

## 5. Lojas

**App Store Connect**
1. Crie o app "Jingar" com o identificador `br.com.jingar.app`.
2. Preencha privacidade, classificação etária, URLs de Privacidade e Termos e a conta de teste, como em [docs/app-store.md](app-store.md).
3. Prints: iPhone de 6,7" e 6,5" (o app é só para iPhone, sem iPad).
4. Teste pelo TestFlight e envie para revisão.

**Google Play Console**
1. Crie o app "Jingar", envie o `.aab` em Teste interno e depois em Produção.
2. Preencha a classificação de conteúdo (app de relacionamento, 18+), a seção Segurança dos dados (mesmos dados do formulário da Apple) e a URL da Política de Privacidade.

## Rodar localmente (opcional)

- Site: `node build.js` e abra `dist/index.html` por um servidor local.
- App: `API_URL=https://jingar.com.br npm run app` e abra `android/` no Android Studio ou `ios/App/App.xcodeproj` no Xcode (só no Mac).
