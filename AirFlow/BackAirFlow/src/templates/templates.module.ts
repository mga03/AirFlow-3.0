import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

/**
 * Módulo de Templates.
 * - Proporciona acceso a templates almacenados en CouchDB.
 * - Servicio con operaciones de lectura/creación de templates.
 */
@Module({
  providers: [TemplatesService],
  controllers: [TemplatesController],
})
export class TemplatesModule {}
