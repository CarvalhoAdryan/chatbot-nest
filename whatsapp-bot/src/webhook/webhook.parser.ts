// src/webhook/webhook.parser.ts
import { IncomingMessage } from './dto/incoming-message';

/**
 * Função utilitária de parsing e filtragem de mensagens da Evolution API.
 * 
 * Regras de Negócio e Filtros:
 * 1. Processa apenas o evento `messages.upsert` (mensagens novas ou atualizadas).
 * 2. Ignora mensagens enviadas pelo próprio robô (`key.fromMe = true`).
 * 3. Ignora mensagens de grupos ou status do WhatsApp (aceita apenas remetentes `@s.whatsapp.net`).
 * 4. Extrai texto (tanto de conversas simples quanto de mensagens com texto estendido/formatado).
 * 5. Extrai dados de localização nativa (latitude e longitude) se enviados pelo usuário.
 * 6. Identifica a presença de mídia (imagens, vídeos ou documentos).
 * 
 * @param body - Payload JSON bruto recebido no corpo da requisição POST.
 * @returns Um objeto `IncomingMessage` pronto para o bot, ou `null` caso a mensagem deva ser ignorada.
 */
export function parseWebhook(body: any): IncomingMessage | null {
    // 1. Garante que seja um evento de nova mensagem
    if (body?.event !== 'messages.upsert') return null;

    const data = body.data;
    const key = data?.key;

    // 2. Ignora se não houver identificador ou se a mensagem partiu do próprio bot
    if (!key || key.fromMe) return null;

    // 3. Ignora mensagens enviadas em grupos ou atualizações de status
    if (!key.remoteJid?.endsWith('@s.whatsapp.net')) return null;

    const m = data.message ?? {};

    // 4. Retorna a mensagem normalizada
    return {
        id: key.id,
        // Remove o sufixo "@s.whatsapp.net", deixando apenas o número puro (ex: 5511999999999)
        from: key.remoteJid.split('@')[0],
        text: m.conversation ?? m.extendedTextMessage?.text,
        location: m.locationMessage
            ? {
                lat: m.locationMessage.degreesLatitude,
                lng: m.locationMessage.degreesLongitude,
            }
            : undefined,
        hasMedia: !!(m.imageMessage || m.videoMessage || m.documentMessage),
        raw: data,
    };
}