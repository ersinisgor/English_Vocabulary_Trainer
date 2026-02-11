import { ConfigService } from '@nestjs/config';

export function isProductionEnv(configService: ConfigService): boolean {
  return configService.get<string>('environment') === 'production';
}
