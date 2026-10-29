# Integração GeoLimp + WhatsApp

Com carinho, Sigma Devs.

## Contrato

`POST /bot/complaints`, com `x-bot-key: <BOT_API_KEY>` e `Idempotency-Key: <chave estável>`.
O backend aceita o payload já produzido pelo chatbot:

```json
{
  "category": "Entulho",
  "description": "Entulho acumulado na rua",
  "address": "Rua A, 123, Centro",
  "latitude": -23.55,
  "longitude": -46.63,
  "photos": [],
  "origem": "whatsapp",
  "telefone": "5511999999999"
}
```

Coordenadas podem ser omitidas juntas; zero é válido. Até cinco URLs HTTP(S).
Telefone só contém dígitos, incluindo país e DDD. Campos extras são rejeitados.
As categorias correspondem a `VALID_CATEGORIES` do chatbot.
Resposta HTTP 201: `{ "id": "#DEN-2026-<uuid>", "complaintId": "<uuid interno>" }`.
`id` é o protocolo que a conversa exibe, não o identificador interno da tabela.
401 indica chave inválida/ausente; 400 indica payload/cabeçalho inválido;
409 indica reaproveitamento de chave com dados diferentes. O throttler global continua ativo (429).

## Configuração e banco

1. No backend, instale com `npm ci` e configure `.env` a partir de `.env.example`.
   Preserve as configurações existentes de banco, JWT e Supabase.
2. Defina um segredo forte `BOT_API_KEY` igual nos dois serviços. Nunca o versione.
   Backend sem chave configurada recusa todas as chamadas desta rota.
3. Gere o Prisma Client com `npm run prisma:generate`.
4. Em um banco **existente** que já contém o schema GeoLimp, revise e aplique uma vez
   `npm run db:bot`. Esse comando executa exclusivamente
   `prisma/sql/20261029_bot_submission.sql`, criando `BotSubmission`.
   Não apaga dados nem altera as tabelas existentes. A segunda execução falha por tabela existente.
   O projeto não tinha migrations/baseline; por isso não foi introduzida uma migration parcial
   que falharia ao inicializar os demais modelos em um banco vazio.
   Para um banco **novo e descartável**, use
   `npx prisma db push --config prisma7.config.ts` para criar o schema completo;
   nesse caso não execute `db:bot` depois. Não use `db push` como migração de produção.
5. Inicie o backend: `npm run build` e `npm run start:prod`. Porta padrão 3000, ajustável por `PORT`.
6. No chatbot, configure `BACKEND_URL=http://localhost:3000` (sem `/bot/complaints`),
   `BOT_API_KEY` igual ao backend e `PORT=3001`. Entre containers, use o hostname do serviço
   backend em vez de localhost. Em hospedagens distintas, utilize a URL HTTPS do backend.
7. Para fluxo real, configure também Redis, Evolution, Supabase e `WEBHOOK_TOKEN`,
   e defina `SIMULATION_MODE=false`. Com `true`, nenhuma denúncia chega ao backend.
   Inicie o chatbot conforme o README do repositório dele.

## Persistência e reenvio

Uma transação PostgreSQL encontra/cria o cidadão pelo telefone, cria denúncia e OS,
registra o recibo de idempotência e só então confirma. Um advisory lock transacional
serializa a mesma chave entre processos; outro serializa cadastros do mesmo telefone.
Perfil e papel de usuários existentes não são alterados. Protocolos usam UUID para evitar
colisões do antigo espaço aleatório de cinco dígitos; o fluxo web existente não foi alterado.

Mesma chave + mesmo payload retorna o protocolo gravado sem recriar entidades/eventos.
A ordem das propriedades JSON não interfere no hash. A ordem das fotos faz parte do payload.
Os recibos não expiram e sobrevivem à exclusão da denúncia: um reenvio antigo retorna
seu protocolo original sem ressuscitar o registro. Não remova recibos sem uma política
coordenada com os retries do chatbot. `origem` é validada pelo endpoint dedicado;
não foi acrescentada uma coluna de origem à tabela Complaint.

Eventos de denúncia e OS são emitidos ao painel após commit. São best effort:
se o processo cair ou o WebSocket falhar após salvar, o painel precisa recarregar os dados.
Não há outbox/replay de eventos. Não se promete exactly-once no envio pelo WhatsApp.
Fotos continuam no Supabase pelo fluxo do chatbot; uploads órfãos não são removidos aqui.

## Validação

Backend: `npm run test:bot` cobre HTTP, autenticação, validação e serviço com banco simulado.
`npm test -- --runInBand` roda a suíte completa.
Para testar locks, concorrência e rollback em PostgreSQL real, prepare um banco descartável
com o schema completo, defina `TEST_DATABASE_URL` e execute
`npm test -- --runInBand chatbot.postgres.spec`. Sem essa variável a suíte é ignorada.
Nunca utilize o banco de produção: o teste cria e remove dados próprios.
Chatbot: `npm test`, `npm run test:e2e`, `npm run typecheck` e `npm run build`.

Homologação real: conclua uma conversa, confirme o protocolo no painel e reenvie a mesma
requisição com a mesma chave. Deve existir uma denúncia e uma OS. Repita com payload
alterado e a mesma chave: deve receber 409. Reinicie o backend e repita a requisição
original: o protocolo deve permanecer igual.

## Git e implantação

Os projetos continuam em repositórios independentes, cada um com sua branch e commit.
Aplique o SQL e publique o backend antes de ativar a configuração real do chatbot.
Em rollback, pode reverter o código mantendo a tabela aditiva e seus recibos.
Esta implementação não aplica SQL em banco existente nem publica serviços automaticamente.

## Ajustes encontrados durante a validação

O Jest do backend agora transforma o pacote ESM `@nestjs/jwt`, e o teste do gateway
injeta seu serviço JWT. `start:prod` aponta a `dist/src/main`, caminho realmente emitido
pelo build atual, que inclui `prisma7.config.ts` na raiz de compilação.
No chatbot, o build desativa `incremental`: o Nest limpa `dist`, e um cache incremental
antigo podia omitir arquivos não modificados, causando `MODULE_NOT_FOUND` em execução.

## Resultado da validação local — 29/10/2026

- Backend: 19 testes passaram; 3 testes de PostgreSQL foram ignorados por falta de TEST_DATABASE_URL.
- Chatbot: 26 testes unitários e 12 HTTP/conversa passaram. Em ambiente lento foi usado `--testTimeout=30000` no e2e.
- Build dos dois projetos e checagem TypeScript concluídos.
- Cliente real do chatbot chamou o controller/serviço real do backend por HTTP: protocolo,
  reenvio e conflito passaram. Banco e WebSocket foram substituídos neste teste.
- Para repetir esse teste entre os repositórios, compile ambos e, na raiz do chatbot,
  execute `npm run test:integration -- "CAMINHO/GeoLimp_backend"`.
- A instalação npm no OneDrive falhou com EPERM neste ambiente. Os testes rodaram em
  cópias temporárias, com dependências do lockfile verificadas por integridade.
- Nenhum banco remoto, credencial real, Evolution ou Supabase foi utilizado na validação.
  A homologação real exige configurar os serviços e aplicar o SQL descrito acima.
