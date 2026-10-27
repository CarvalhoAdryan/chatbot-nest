// src/messaging/console.messenger.ts
import { Injectable } from '@nestjs/common';
import { Messenger } from './messenger';

/**
 * Provedor de Mensagens Simulado para Desenvolvimento (ConsoleMessenger).
 * 
 * Implementa a interface `Messenger`, mas em vez de disparar uma requisição HTTP
 * para a API da Evolution (o que custaria tráfego ou dependeria de um WhatsApp conectado),
 * ele imprime a mensagem diretamente no console do terminal.
 * 
 * Ativado quando a variável `USE_FAKE_MESSENGER=true` no arquivo `.env`.
 */
@Injectable()
export class ConsoleMessenger implements Messenger {
    /**
     * Simula o envio de texto imprimindo no terminal local.
     */
    async sendText(number: string, text: string): Promise<void> {
        console.log(`\n[BOT → ${number}]\n${text}\n`);
    }
}