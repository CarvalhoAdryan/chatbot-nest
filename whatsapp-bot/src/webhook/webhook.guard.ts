// src/webhook/webhook.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard de Segurança do Webhook (WebhookGuard).
 * 
 * Protege a rota pública `/webhook` contra requisições não autorizadas ou ataques externos.
 * Exige que a Evolution API envie o token secreto no cabeçalho HTTP `x-webhook-token`.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }

    /**
     * Valida a requisição antes que ela chegue ao controlador.
     * 
     * @param ctx - Contexto de execução do NestJS (contém a requisição HTTP).
     * @returns `true` se o token do cabeçalho for idêntico à variável WEBHOOK_TOKEN.
     * @throws `UnauthorizedException` (HTTP 401) se o token for ausente ou incorreto.
     */
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest();
        const incomingToken = req.headers['x-webhook-token'];
        const expectedToken = this.config.get<string>('WEBHOOK_TOKEN');

        if (!incomingToken || incomingToken !== expectedToken) {
            throw new UnauthorizedException('Token de autenticação do webhook inválido ou ausente');
        }

        return true;
    }
}