// src/conversation/session/memory-session.store.ts
import { Injectable } from '@nestjs/common';
import { SessionStore } from './session.store';
import { Session } from './session.types';

/** Tempo de expiração da sessão: 30 minutos de inatividade */
const TTL_MS = 30 * 60 * 1000;

/**
 * Armazenamento de Sessões em Memória (MemorySessionStore).
 * 
 * Implementação padrão para ambiente de desenvolvimento ou instâncias únicas.
 * Armazena as sessões em um `Map` nativo do JavaScript com controle de TTL.
 * 
 * Utiliza `structuredClone` tanto no `get` quanto no `set` para garantir
 * cópias profundas e isolamento de estado, evitando efeitos colaterais por referência.
 */
@Injectable()
export class MemorySessionStore implements SessionStore {
    private data = new Map<string, { session: Session; expiresAt: number }>();

    /**
     * Recupera a sessão do usuário se existir e não tiver expirado.
     */
    async get(id: string): Promise<Session | null> {
        const entry = this.data.get(id);
        if (!entry) return null;

        // Se o tempo limite foi ultrapassado, apaga e considera sessão expirada
        if (Date.now() > entry.expiresAt) {
            this.data.delete(id);
            return null;
        }

        return structuredClone(entry.session);
    }

    /**
     * Salva ou renova a sessão do usuário com mais 30 minutos de TTL a partir de agora.
     */
    async set(id: string, session: Session): Promise<void> {
        this.data.set(id, {
            session: structuredClone(session),
            expiresAt: Date.now() + TTL_MS,
        });
    }

    /**
     * Exclui a sessão do usuário da memória.
     */
    async delete(id: string): Promise<void> {
        this.data.delete(id);
    }
}