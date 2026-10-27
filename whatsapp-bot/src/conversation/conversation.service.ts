// src/conversation/conversation.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from '../webhook/dto/incoming-message';
import { messages } from './messages';
import { normalize } from './text.util';
import { SESSION_STORE, type SessionStore } from './session/session.store';
import { Draft, Session, STEP_ORDER } from './session/session.types';
import { STEPS } from './steps';

/**
 * Orquestrador da Máquina de Estados da Conversa (ConversationService).
 * 
 * Responsabilidades:
 * 1. Serializar mensagens por usuário para evitar condições de corrida (Race Conditions).
 * 2. Carregar e persistir a sessão ativa através do `SessionStore`.
 * 3. Processar comandos globais (`cancelar` e `voltar`).
 * 4. Delegar a validação e transição de estado para o respectivo `Step`.
 * 5. Consolidar o payload da denúncia e despachar para o backend ao finalizar.
 */
@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);

    /** Fila de promessas por número de telefone para processamento sequencial estrito */
    private queues = new Map<string, Promise<void>>();

    constructor(@Inject(SESSION_STORE) private readonly store: SessionStore) { }

    /**
     * Processa uma mensagem por vez por número de telefone.
     * 
     * Como funciona o controle de concorrência:
     * - Se o usuário enviar várias fotos ou textos muito rápido pelo WhatsApp,
     *   as chamadas são encadeadas via Promises (`prev.then(...)`).
     * - A mensagem 2 só começa a rodar após a mensagem 1 ter terminado de atualizar a sessão,
     *   evitando perda de fotos ou inconsistência no rascunho.
     * 
     * @param msg - Mensagem recebida do usuário via Webhook.
     * @returns Resposta em texto gerada pelo bot para ser enviada de volta ao usuário.
     */
    handle(msg: IncomingMessage): Promise<string> {
        const prev = this.queues.get(msg.from) ?? Promise.resolve();
        const run = prev.then(() => this.process(msg));
        const tail = run.then(() => undefined, () => undefined);
        this.queues.set(msg.from, tail);

        // Limpa a fila da memória quando a última promise for concluída
        tail.then(() => {
            if (this.queues.get(msg.from) === tail) {
                this.queues.delete(msg.from);
            }
        });

        return run;
    }

    /**
     * Lógica central de transição de estados e processamento de regras de negócio.
     */
    private async process(msg: IncomingMessage): Promise<string> {
        let session = await this.store.get(msg.from);

        // Caso 1: Usuário não tem sessão ativa -> Inicia uma nova denúncia no passo 'CATEGORIA'
        if (!session) {
            session = { step: 'CATEGORIA', draft: { photoIds: [] } };
            await this.store.set(msg.from, session);
            return messages.welcome + '\n' + STEPS.CATEGORIA.prompt(session);
        }

        const text = normalize(msg.text ?? '');

        // Caso 2: Comandos Globais (funcionam em qualquer momento da conversa)
        if (text === 'cancelar') {
            await this.store.delete(msg.from);
            return messages.cancelled;
        }

        if (text === 'voltar') {
            const idx = STEP_ORDER.indexOf(session.step);
            // Se já estiver na primeira pergunta, avisa que não tem como voltar mais
            if (idx === 0) {
                return messages.firstQuestion;
            }
            // Retrocede um índice na ordem dos passos
            session.step = STEP_ORDER[idx - 1];
            await this.store.set(msg.from, session);
            return STEPS[session.step].prompt(session);
        }

        // Caso 3: Execução do Passo Atual
        const result = STEPS[session.step].handle(msg, session);

        switch (result.type) {
            // Permanece no mesmo passo (ex: erro de validação ou foto recebida com sucesso)
            case 'stay':
                await this.store.set(msg.from, session);
                return result.message;

            // Avança para o próximo passo especificado
            case 'next':
                session.step = result.next;
                await this.store.set(msg.from, session);
                return STEPS[result.next].prompt(session);

            // Cancela a sessão (ex: respondeu "não" na confirmação)
            case 'cancel':
                await this.store.delete(msg.from);
                return messages.cancelled;

            // Conclui a denúncia (respondeu "sim" na confirmação)
            case 'finish': {
                const payload = this.buildPayload(session.draft, msg.from);
                await this.store.delete(msg.from);

                // Na integração final:
                // 1. Faz upload das fotos via StorageService.uploadPhoto()
                // 2. Chama backendClient.createComplaint(payload)
                this.logger.log('Denúncia finalizada com sucesso:\n' + JSON.stringify(payload, null, 2));
                return messages.finished('SIMULADO-0001');
            }
        }
    }

    /**
     * Monta o objeto final consolidado da denúncia com base no rascunho preenchido.
     */
    private buildPayload(d: Draft, phone: string) {
        return {
            category: d.category,
            description: d.description,
            address: d.address,
            latitude: d.latitude,
            longitude: d.longitude,
            photos: d.photoIds,
            origem: 'whatsapp',
            telefone: phone,
        };
    }
}