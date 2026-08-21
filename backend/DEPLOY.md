# Publicar o backend

Enquanto a API só existe na sua máquina, o Atalho do iPhone só funciona no
Wi-Fi de casa. Publicar resolve isso — e é a única peça que depende de uma
decisão sua, porque envolve uma conta em algum provedor.

Está tudo pronto do lado do código: `Dockerfile`, migrações que rodam sozinhas
na subida, e a configuração já sabe lidar com Postgres.

## O que escolher

Qualquer provedor que rode um container e ofereça Postgres serve. Os três que
têm plano grátis suficiente pra um app de uso pessoal:

- **Railway** — o mais direto: conecta no repositório, detecta o `Dockerfile`,
  e o Postgres é um clique. Grátis até um limite mensal de uso.
- **Render** — parecido. O plano grátis dorme depois de 15 min sem acesso, o
  que faz o primeiro toque do Atalho depois de um tempo demorar uns 30s.
- **Fly.io** — mais controle, um pouco mais de configuração.

Pra um Atalho que você aperta várias vezes por dia, o Render dormindo é um
incômodo real. **Railway é a escolha mais confortável.**

## Os passos

**1. Suba o código pro GitHub.** O provedor lê de lá.

**2. Crie o serviço** apontando pra pasta `backend/`. Ele vai achar o
`Dockerfile` sozinho.

**3. Adicione um Postgres** no mesmo projeto. O provedor injeta a variável
`DATABASE_URL`.

**4. Configure as variáveis de ambiente:**

| variável | valor |
|---|---|
| `APP_DATABASE_URL` | a mesma `DATABASE_URL` do Postgres |
| `APP_JWT_SECRET_KEY` | um segredo gerado por você (abaixo) |
| `APP_PRODUCTION` | `true` |
| `APP_CORS_ORIGINS` | o endereço do app, ou `*` se for só seu |

Gere o segredo com:

```
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

> `APP_PRODUCTION=true` faz a aplicação **recusar subir** sem o segredo. É de
> propósito: um segredo padrão que funciona é um segredo que vai esquecido pra
> produção, e aí qualquer pessoa forja o token de qualquer usuário.

**5. Faça o deploy.** As migrações rodam sozinhas na subida — não há passo
separado pra esquecer.

**6. Confira:** `https://seu-endereco/health` deve responder
`{"status":"ok"}`.

## Depois de publicar

**No app:** troque o `EXPO_PUBLIC_API_URL` do `.env` pro endereço público. Fora
disso o app continua deduzindo o endereço pelo Expo em desenvolvimento — o
`.env` só entra quando essa dedução não serve.

**No Atalho:** ele guarda o endereço dentro dele. Abra a tela *Atalho do
iPhone* no app, copie o endereço novo e cole no bloco **Obter Conteúdo de URL**.
O token continua o mesmo.

**Os seus dados de hoje ficam na sua máquina.** O SQLite local
(`minhas_financas.db`) não vai junto — o `.dockerignore` o exclui de propósito,
porque mandá-lo sobrescreveria dados de produção por engano. A conta em
produção começa vazia; é só se cadastrar de novo.

## Uma coisa que muda de peso

Publicado, o backend fica acessível pra qualquer pessoa na internet. O que
protege as contas continua sendo o mesmo de sempre — senha com bcrypt, token
JWT, e toda consulta filtrando por `user_id` —, mas duas coisas passam a
importar de verdade:

- **O segredo do JWT.** Se ele vazar, qualquer pessoa forja qualquer token.
  Nunca o coloque no repositório; só nas variáveis do provedor.
- **O token do Atalho.** Ele só cria lançamento e pode ser revogado sozinho na
  tela do Atalho — foi desenhado assim justamente pensando neste dia.
