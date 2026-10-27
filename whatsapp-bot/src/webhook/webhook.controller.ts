// src/webhook/webhook.controller.ts
import { Body, Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { MESSENGER, type Messenger } from '../messaging/messenger';
import { IdempotencyService } from '../common/idempotency.service';
import { WebhookGuard } from './webhook.guard';
import { parseWebhook } from './webhook.parser';

/**
 * Controlador de Entrada do Webhook (WebhookController).
 * 
 * Rota: `POST /webhook`
 * 
 * Fluxo de execução de cada requisição:
 * 1. Passa pelo `WebhookGuard` para validar o token de segurança no cabeçalho.
 * 2. Faz o parsing do JSON via `parseWebhook(body)` para filtrar e normalizar os dados.
 * 3. Valida no `IdempotencyService` se a mensagem já foi processada recentemente.
 * 4. Encaminha a resposta para o remetente usando o provedor de mensageria configurado.
 */
@Controller('webhook')
@UseGuards(WebhookGuard)
export class WebhookController {
    constructor(
        @Inject(MESSENGER) private readonly messenger: Messenger,
        private readonly idempotency: IdempotencyService,
    ) { }

    /**
     * Endpoint que recebe as notificações de mensagens enviadas pela Evolution API.
     * Retorna HTTP 200 para confirmar o recebimento e evitar reenvios da API externa.
     * 
     * @param body - Payload bruto enviado pela Evolution API.
     */
    @Post()
    @HttpCode(200)
    async handle(@Body() body: any) {
        // 1. Converte e filtra a mensagem
        const msg = parseWebhook(body);
        if (!msg) {
            return { ignored: true };
        }

        // 2. Proteção contra retries e mensagens duplicadas
        if (this.idempotency.isDuplicate(msg.id)) {
            return { duplicate: true };
        }

        // 3. Resposta ao usuário:
        // Atualmente responde com eco de teste. Para ativar a máquina de estados completa,
        // injeta-se o ConversationService e chama-se: await this.conversation.handle(msg);
        await this.messenger.sendText(msg.from, `Você disse: ${msg.text ?? '[sem texto]'}`);
        return { ok: true };
    }
}