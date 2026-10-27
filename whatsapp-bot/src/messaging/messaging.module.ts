// src/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MESSENGER } from './messenger';
import { ConsoleMessenger } from './console.messenger';
import { EvolutionClient } from './evolution.client';

/**
 * Módulo de Mensageria (MessagingModule).
 * 
 * Responsabilidades:
 * - Configura e fornece o serviço de saída de mensagens.
 * - Utiliza uma Factory (`useFactory`) para decidir dinamicamente em tempo de inicialização:
 *   - Se `USE_FAKE_MESSENGER === 'true'`: provê o `ConsoleMessenger` (simulação no terminal).
 *   - Caso contrário: provê o `EvolutionClient` (disparo real pelo WhatsApp).
 * - Exporta o token `MESSENGER` para que qualquer módulo possa injetar `@Inject(MESSENGER)`.
 */
@Module({
    imports: [HttpModule],
    providers: [
        ConsoleMessenger,
        EvolutionClient,
        {
            provide: MESSENGER,
            inject: [ConfigService, ConsoleMessenger, EvolutionClient],
            useFactory: (config: ConfigService, fake: ConsoleMessenger, real: EvolutionClient) =>
                config.get('USE_FAKE_MESSENGER') === 'true' ? fake : real,
        },
    ],
    exports: [MESSENGER],
})
export class MessagingModule { }