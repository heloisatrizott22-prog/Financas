# Minhas Finanças — como colocar o app no ar

O app fica num site seu (GitHub Pages), os dados ficam no Firebase (Google) e um "robô" do GitHub manda as notificações todo dia. Tudo no plano gratuito, sem cartão de crédito.

Você vai precisar de: um computador (é mais fácil que no celular), uma conta Google e uns 30 minutos.

---

## Passo 1 — Criar o projeto no Firebase

1. Entre em **console.firebase.google.com** com sua conta Google.
2. Clique em **Criar um projeto** (ou "Add project"). Nome: `minhas-financas`. Pode desligar o Google Analytics. Clique em **Criar**.
3. **Login:** no menu da esquerda, abra **Build → Authentication → Get started**. Em **Sign-in method**, escolha **E-mail/senha**, ligue a primeira chave e salve.
4. **Banco de dados:** abra **Build → Firestore Database → Create database**. Escolha a região `us-east1` (ou a sugerida), modo **production**, e crie.
5. Ainda no Firestore, abra a aba **Rules**, apague tudo, cole o conteúdo do arquivo `firestore.rules` e clique em **Publish**.

## Passo 2 — Pegar os dados do app (configuração)

1. Clique na engrenagem ⚙️ ao lado de "Project Overview" → **Project settings**.
2. Em **Your apps**, clique no ícone **`</>`** (Web). Nome: `Minhas Finanças`. **Não** marque "Firebase Hosting". Clique em **Register app**.
3. Vai aparecer um bloco com `apiKey`, `authDomain`, `projectId`... Copie esses valores para o arquivo **`firebase-config.js`** (ou mande para o Claude que ele coloca para você — esses dados não são secretos).
4. Ainda em Project settings, abra a aba **Cloud Messaging**. Em **Web Push certificates**, clique em **Generate key pair**. Copie a chave que aparece e cole em `vapidKey` no mesmo arquivo.

## Passo 3 — Colocar o app no ar (GitHub Pages)

1. Crie uma conta grátis em **github.com** (se ainda não tiver).
2. Crie um repositório novo chamado `minhas-financas`, **Public**.
3. Envie todos os arquivos desta pasta para o repositório (o Claude pode fazer isso por você se você conectar o GitHub a ele).
4. No repositório: **Settings → Pages**. Em "Branch", escolha `main` e a pasta `/ (root)`. Salve.
5. Depois de 1 ou 2 minutos, o app fica em: `https://heloisatrizott22-prog.github.io/Financas/`

## Passo 4 — Liberar as notificações automáticas

1. No Firebase: ⚙️ **Project settings → Service accounts → Generate new private key**. Vai baixar um arquivo `.json`.
   ⚠️ Esse arquivo é uma **senha**. Não mande para ninguém, nem para o Claude.
2. No GitHub, no seu repositório: **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: abra o arquivo `.json` baixado, copie **todo** o conteúdo e cole aqui. Salve.
3. Depois disso pode apagar o arquivo `.json` do seu computador.
4. Abra a aba **Actions** do repositório e, se pedir, clique em **"I understand my workflows, go ahead and enable them"**.

## Passo 5 — Instalar no iPhone

1. No iPhone, abra o link do app no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta) → **Adicionar à Tela de Início**.
3. Abra o app **pelo ícone** na tela de início.
4. Toque em **Primeira vez? Criar conta**, coloque seu e-mail e uma senha.
5. Suas 23 assinaturas já aparecem. Na aba **Gastos**, toque em **Importar agora** para trazer os extratos de agosto a outubro.
6. Toque na ⚙️ (Início) → **Ativar notificações** → **Permitir**.

## Passo 6 — Testar a notificação

No GitHub: **Actions → Lembretes de cobrança → Run workflow**, escreva `teste` e clique em **Run workflow**. Em até 1 minuto deve chegar "Teste: as notificações estão funcionando ✅" no celular.

Depois disso, o robô roda sozinho todo dia por volta das 6:40 da tarde e avisa das cobranças que estão chegando (você escolhe quantos dias antes, na ⚙️).

---

## Dica de segurança

Depois de criar sua conta no app, você pode desligar a criação de contas novas: Firebase → **Authentication → Settings → User actions** → desmarque **Enable create (sign-up)**. Assim só você entra.

## Para mudar o app

Mande suas ideias para o Claude. Ele altera os arquivos e envia de novo para o GitHub — o app no celular se atualiza sozinho na próxima vez que você abrir.

## Extra: abrir a tela de lançar com dois toques nas costas do iPhone

1. Abra o app **Atalhos** (Shortcuts) → **+** → **Adicionar ação** → procure **Abrir URLs**.
2. Cole o link do app com `#lancar` no final, por exemplo: `https://heloisatrizott22-prog.github.io/Financas/#lancar`. Dê o nome **Lançar gasto** e salve.
3. Vá em **Ajustes → Acessibilidade → Toque → Toque Traseiro → Toque Duplo** e escolha o atalho **Lançar gasto**.

Agora, dois toques nas costas do iPhone abrem direto a tela de lançar. (O atalho abre pelo Safari — entre na sua conta uma vez por lá.)

Para abrir direto no assistente, use `#assistente` no lugar de `#lancar`.
