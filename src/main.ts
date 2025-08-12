import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify';
import {AppModule} from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            bodyLimit: 1024 * 1024 * 1024,
            logger: true,
        }),
    );

    return await app.listen(3000, '0.0.0.0');
}

bootstrap();
