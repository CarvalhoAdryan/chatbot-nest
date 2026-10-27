// src/messaging/evolution.client.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Messenger } from './messenger';

/**
 * Cliente Oficial de Integração com a Evolution API (EvolutionClient).
 * 
 * Implementa a interface `Messenger` enviando mensagens de verdade para o WhatsApp
 * através do endpoint `/message/sendText/{instancia}` da Evolution API.
 * 
 * Utilizado em produção ou em desenvolvimento quando `USE_FAKE_MESSENGER=false`.
 */
@Injectable()
export class EvolutionClient implements Messenger {
    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Envia uma mensagem de texto real para um número via Evolution API.
     * 
     * @param number - Número de destino com DDI (ex: 5511999999999).
     * @param text - Conteúdo da mensagem a ser enviada.
     */
    async sendText(number: string, text: string): Promise<void> {
        const url = this.config.get<string>('EVOLUTION_URL');
        const instance = this.config.get<string>('EVOLUTION_INSTANCE');
        const apikey = this.config.get<string>('EVOLUTION_APIKEY');

        await firstValueFrom(
            this.http.post(
                `${url}/message/sendText/${instance}`,
                { number, text },
                { headers: { apikey } },
            ),
        );
    }
}