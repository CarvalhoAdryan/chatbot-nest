// src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/** Mapeamento de tipos MIME para extensões de arquivo correspondentes */
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Serviço de Armazenamento de Arquivos em Nuvem (StorageService).
 * 
 * Integração com o Supabase Storage para salvar imagens enviadas pelos cidadãos durante a denúncia.
 */
@Injectable()
export class StorageService {
  /** Cliente oficial da API do Supabase */
  private readonly client: SupabaseClient;

  /** Nome do bucket configurado no Supabase (ex.: "denuncias-midia") */
  private readonly bucket: string;

  constructor(config: ConfigService) {
    // Inicializa o cliente do Supabase com as credenciais do .env
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
    this.bucket = config.getOrThrow<string>('SUPABASE_BUCKET');
  }

  /**
   * Faz o upload de uma foto no Supabase Storage e retorna a URL pública acessível.
   * 
   * Estrutura de pastas no bucket:
   * `whatsapp/{numero_telefone}/{timestamp}-{uuid}.{ext}`
   * 
   * @param buffer - Dados binários da imagem.
   * @param mimetype - Tipo de mídia (ex: "image/jpeg", "image/png").
   * @param phone - Telefone do usuário para organizar os arquivos por remetente.
   * @returns URL pública permanente para visualização e download da foto.
   */
  async uploadPhoto(buffer: Buffer, mimetype: string, phone: string): Promise<string> {
    const ext = EXT[mimetype] ?? 'jpg';
    const path = `whatsapp/${phone}/${Date.now()}-${randomUUID()}.${ext}`;

    // 1. Envia o buffer para o bucket do Supabase
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buffer, { contentType: mimetype, upsert: false });

    if (error) {
      throw error;
    }

    // 2. Obtém e devolve a URL pública do arquivo armazenado
    return this.client.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }
}