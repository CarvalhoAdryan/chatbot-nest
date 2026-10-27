// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

/**
 * Módulo Comum (CommonModule).
 * 
 * Agrupa serviços e utilitários compartilhados entre múltiplos módulos da aplicação.
 * Exporta o IdempotencyService para que outros módulos (como o WebhookModule)
 * possam utilizá-lo na deduplicação de mensagens.
 */
@Module({
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class CommonModule { }