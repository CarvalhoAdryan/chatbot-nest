// src/conversation/steps/fotos.step.ts
import { messages } from '../messages';
import { normalize } from '../text.util';
import { Step } from './step.interface';

/** Limite máximo de fotos aceitas por denúncia */
const MAX_PHOTOS = 5;

/**
 * Passo 5: Envio de Fotos (Evidências Visuais).
 * 
 * Regras:
 * - Opcional: o usuário pode enviar até 5 fotos (uma a uma ou em lote).
 * - Cada foto recebida (`hasMedia = true`) tem seu `id` de mensagem registrado no array `photoIds`.
 * - O usuário pode digitar "pronto" a qualquer momento para concluir a inclusão de fotos.
 * - O usuário pode digitar "pular" caso não queira anexar nenhuma foto.
 * - Ao atingir o limite de 5 fotos, o bot avisa que o limite foi alcançado e solicita que digite "pronto".
 */
export const fotosStep: Step = {
    prompt: () => messages.fotos(),

    handle(msg, session) {
        const photos = session.draft.photoIds;

        // Se a mensagem enviada for uma mídia (foto)
        if (msg.hasMedia) {
            if (photos.length >= MAX_PHOTOS) {
                return {
                    type: 'stay',
                    message: `Limite de ${MAX_PHOTOS} fotos. Digite *pronto* para continuar.`,
                };
            }

            photos.push(msg.id);
            return {
                type: 'stay',
                message: `📷 Foto ${photos.length} recebida. Envie outra ou digite *pronto*.`,
            };
        }

        // Se o usuário digitou texto
        const text = normalize(msg.text ?? '');
        if (text === 'pronto' || text === 'pular') {
            return { type: 'next', next: 'CONFIRMACAO' };
        }

        return {
            type: 'stay',
            message: 'Envie uma foto, ou digite *pronto* / *pular*.',
        };
    },
};