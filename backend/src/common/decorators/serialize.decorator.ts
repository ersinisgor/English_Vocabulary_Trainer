import { UseInterceptors, applyDecorators, Type } from '@nestjs/common';
import { SerializeInterceptor } from '../interceptors/serialize.interceptor';

export function Serialize(dto: Type) {
  return applyDecorators(UseInterceptors(new SerializeInterceptor(dto)));
}
