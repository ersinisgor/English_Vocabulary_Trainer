import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WordsModule } from './words/words.module';
import configuration from './config/configuration';
import validationSchema from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: [configuration],
      validationSchema,
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    WordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
