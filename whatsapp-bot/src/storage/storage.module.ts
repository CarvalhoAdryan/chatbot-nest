// src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Módulo de Armazenamento (StorageModule).
 * 
 * Fornece e exporta o `StorageService` para upload de fotos no Supabase.
 * Pode ser importado pelo `ConversationModule` para gerar URLs de mídias enviadas.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}