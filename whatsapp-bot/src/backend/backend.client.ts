// src/backend/backend.client.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { BackendError } from './backend.error';
import { CreateComplaintPayload } from './dto/create-complaint.payload';

/**
 * Cliente HTTP para a API Central de Denúncias (BackendClient).
 * 
 * Responsável por despachar os chamados montados pelo bot para o sistema de gestão
 * da ouvidoria/prefeitura.
 */
@Injectable()
export class BackendClient {
    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Envia o chamado formatado via POST para a rota `/bot/complaints`.
     * 
     * @param payload - Objeto com categoria, descrição, endereço, fotos, etc.
     * @returns Objeto com o identificador/protocolo gerado (ex.: `{ id: "DEN-2026-0042" }`).
     * @throws `BackendError` com o status HTTP e a mensagem detalhada em caso de falha.
     */
    async createComplaint(payload: CreateComplaintPayload): Promise<{ id: string }> {
        try {
            const res = await firstValueFrom(
                this.http.post(`${this.config.get<string>('BACKEND_URL')}/bot/complaints`, payload, {
                    headers: { 'x-bot-key': this.config.get<string>('BOT_API_KEY') },
                    timeout: 15000, // Timeout de 15 segundos
                }),
            );
            return res.data;
        } catch (e) {
            const err = e as AxiosError<any>;
            const msg = err.response?.data?.message;

            // Formata array de erros de validação (ex: class-validator) em linhas legíveis
            const formattedMessage = Array.isArray(msg)
                ? msg.join('\n')
                : String(msg ?? err.message);

            throw new BackendError(err.response?.status, formattedMessage);
        }
    }
}