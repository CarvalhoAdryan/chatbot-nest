const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
// Banco e WebSocket substituídos; o cliente do chatbot e o HTTP do backend são reais.
if (!process.argv[2]) throw new Error('Informe o caminho do repositório GeoLimp_backend.');
const backend = createRequire(path.resolve(process.argv[2], 'package.json'));
const chatbot = createRequire(path.resolve(__dirname, '../whatsapp-bot/package.json'));
const { Test } = backend('@nestjs/testing');
const { ChatbotController } = backend('./dist/src/modules/chatbot/chatbot.controller');
const { ChatbotService } = backend('./dist/src/modules/chatbot/chatbot.service');
const { BotKeyGuard } = backend('./dist/src/modules/chatbot/bot-key.guard');
const { PrismaService } = backend('./dist/src/shared/prisma/prisma.service');
const { EventsGateway } = backend('./dist/src/events/events.gateway');
const { BackendClient } = chatbot('./dist/backend/backend.client');
const { ConfigService } = chatbot('@nestjs/config');
const { HttpService } = chatbot('@nestjs/axios');
async function main() {
 process.env.BOT_API_KEY = 'test-only-secret';
 const receipts = new Map(); let complaints=0; let orders=0;
 const tx = {
  $queryRaw: async()=>[],
  botSubmission: {findUnique: async({where})=>receipts.get(where.key), create:async({data})=>{receipts.set(data.key,data); return data;}},
  user:{upsert:async()=>({id:'test-user'})},
  complaint:{create:async({data})=>({id:`complaint-${++complaints}`,...data})},
  serviceOrder:{create:async({data})=>({id:`order-${++orders}`,...data})}
 };
 const module = await Test.createTestingModule({controllers:[ChatbotController],providers:[ChatbotService,BotKeyGuard,
  {provide:PrismaService,useValue:{$transaction:async(fn)=>fn(tx)}}, {provide:EventsGateway,useValue:{broadcastNewMapItem:()=>{}}}]}).compile();
 const app=module.createNestApplication(); app.useLogger(false);
 try {
  await app.listen(0,'127.0.0.1');
  const client=new BackendClient(new HttpService(),new ConfigService({BACKEND_URL:await app.getUrl(),BOT_API_KEY:process.env.BOT_API_KEY}));
  const payload={category:'Entulho',description:'Entulho acumulado na rua',address:'Rua A, 123',photos:[],origem:'whatsapp',telefone:'5511999999999'};
  const first=await client.createComplaint(payload,'cross-repo-key');
  assert.match(first.id,/^#DEN-/);
  assert.deepEqual(await client.createComplaint(payload,'cross-repo-key'),first);
  await assert.rejects(client.createComplaint({...payload,address:'Rua B, 456'},'cross-repo-key'),e=>e.status===409);
  assert.equal(complaints,1); assert.equal(orders,1);
  console.log('PASS: real chatbot BackendClient -> HTTP -> backend controller/service, replay and conflict (database substituted).');
 } finally {await app.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
