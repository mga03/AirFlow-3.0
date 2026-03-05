import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Carga variables de entorno antes de inicializar la app.
dotenv.config();

/**
 * Punto de entrada de la aplicación NestJS.
 * - Crea la app usando `AppModule`.
 * - Habilita CORS para permitir llamadas desde el frontend en otro puerto.
 * - Escucha en el puerto 3000.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  
  await app.listen(3000);
}

bootstrap();
