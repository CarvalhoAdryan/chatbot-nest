// src/common/idempotency.service.ts
import { Injectable } from '@nestjs/common';

/**
 * Serviço de Idempotência (IdempotencyService).
 * 
 * Finalidade:
 * Evitar que a mesma mensagem do WhatsApp seja processada mais de uma vez.
 * Webhooks da Evolution API ou instabilidades de rede podem reenviar o mesmo evento
 * repetidas vezes (retries automáticos).
 * 
 * Funcionamento:
 * Mantém um cache em memória com os IDs de mensagens recebidas nos últimos 10 minutos (TTL).
 * Mensagens expiradas são removidas automaticamente da memória para evitar vazamento de memória (memory leak).
 */
@Injectable()
export class IdempotencyService {
    /** Armazena o ID da mensagem e o timestamp (em ms) de quando ela foi recebida */
    private seen = new Map<string, number>();

    /** Tempo de vida do registro no cache: 10 minutos em milissegundos */
    private readonly ttlMs = 10 * 60 * 1000;

    /**
     * Verifica se a mensagem já foi processada anteriormente.
     * 
     * @param id - Identificador único da mensagem no WhatsApp (ex.: "3EB0...").
     * @returns `true` se a mensagem for duplicada (já foi vista dentro do TTL);
     *          `false` se for inédita (registra o ID no cache e permite o fluxo).
     */
    isDuplicate(id: string): boolean {
        const now = Date.now();

        // Limpeza periódica: remove chaves cujo tempo expirou
        for (const [k, t] of this.seen) {
            if (now - t > this.ttlMs) {
                this.seen.delete(k);
            }
        }

        // Se o ID já estiver registrado, é duplicada
        if (this.seen.has(id)) {
            return true;
        }

        // Primeira vez que vemos esse ID: registra com o timestamp atual
        this.seen.set(id, now);
        return false;
    }
}