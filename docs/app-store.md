# Jingar na App Store: o que preencher

Guia para as partes da Apple que não ficam no código.

## Variáveis na Vercel

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Banco Neon (já configurado). |
| `RESEND_API_KEY` e `EMAIL_REMETENTE` | Enviar o código por e-mail. `EMAIL_REMETENTE` precisa ser de um domínio verificado no Resend, por exemplo `Jingar <nao-responda@seudominio.com>`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_FROM` (ou `TWILIO_MESSAGING_SERVICE_SID`) | Enviar o código por SMS. |
| `CONTATO_EMAIL` | E-mail de contato publicado no app, nos Termos e na Política de Privacidade. |
| `ADMIN_TOKEN` | Senha do painel de moderação (`/moderacao.html`). Use 16 caracteres ou mais, aleatórios. |

Sem `RESEND_API_KEY`, o cadastro por e-mail mostra "envio de código por e-mail ainda não está configurado". Sem Twilio, o mesmo acontece com celular.

## Moderação (regra 1.2)

- Painel: `https://SEU-SITE/moderacao.html`, com o `ADMIN_TOKEN`.
- A Apple exige agir sobre denúncias em até 24 horas. Abra o painel todos os dias.
- "Banir usuário" desconecta a pessoa na hora e impede novos logins.
- Na revisão, informe à Apple: o app permite denunciar e bloquear perfis, as denúncias são revisadas em até 24 horas e o contato é o `CONTATO_EMAIL`.

## Classificação etária

No questionário da App Store Connect, marque o app como de relacionamento ("Unrestricted Web Access": não; "Mature/Suggestive Themes": raramente). O resultado deve ser **18+** (ou 17+, conforme o formulário). O app também confirma a data de nascimento no cadastro e recusa menores de 18 anos.

## Privacidade do app (App Privacy)

Responda "Sim, coletamos dados". Todos abaixo são **vinculados à identidade** e **não usados para rastreamento**:

| Tipo na Apple | O que é no Jingar | Finalidade |
|---|---|---|
| Contact Info → Email Address, Phone Number | E-mail ou celular do cadastro | App Functionality |
| User Content → Photos, Audio, Other User Content, Customer Support | Foto do perfil, áudios e mensagens do chat, arquivos do quiz, denúncias | App Functionality |
| Identifiers → User ID | Nome de usuário e identificador da conta | App Functionality |
| Location → Coarse Location | Só se a pessoa tocar em "Usar minha localização" | App Functionality |
| Sensitive Info | Interesse (quem quer conhecer) | App Functionality |
| Usage Data → Product Interaction | Respostas, níveis, curtidas, matches | App Functionality |
| Other Data → data de nascimento | Confirmar 18+ | App Functionality |

URL da Política de Privacidade: `https://SEU-SITE/privacidade.html`
URL dos Termos (EULA personalizado): `https://SEU-SITE/termos.html`

## Textos de permissão (Info.plist do iOS)

Quando o app for empacotado com Capacitor, use estes textos:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>O Jingar usa o microfone só para gravar os áudios que você envia no chat.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Usamos sua localização só para calcular a distância até outras pessoas. Ela não aparece para ninguém.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Escolha uma foto para o seu perfil ou fotos de material de estudo para criar um quiz.</string>
<key>NSCameraUsageDescription</key>
<string>Tire uma foto para o seu perfil ou de um material de estudo para criar um quiz.</string>
```

O app já explica o motivo antes de pedir o microfone e a localização.

## Conta de teste para o revisor

Crie uma conta verificada só para a Apple e informe usuário e senha em "App Review Information". Explique que os outros perfis do protótipo são de demonstração até haver usuários reais, ou remova os perfis fictícios antes de enviar (a Apple recusa perfis falsos em apps de relacionamento).
