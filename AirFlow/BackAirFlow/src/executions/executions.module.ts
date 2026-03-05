import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Execution } from './entities/execution.entity';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { DagsModule } from '../dags/dags.module';

/**
 * ExecutionsModule
 *
 * Módulo encargado de la gestión completa del ciclo de vida de ejecuciones de DAGs.
 *
 * **Responsabilidades**:
 * - Proveer controlador REST para ejecuciones
 * - Proveer servicio CRUD de ejecuciones
 * - Registrar entidad Execution en TypeORM
 * - Importar DagsModule para interactuar con Airflow
 *
 * **Componentes del módulo**:
 * - ExecutionsController: Endpoints REST
 * - ExecutionsService: Lógica de negocio (CRUD, sincronización, estadísticas)
 * - Execution Entity: Mapeo TypeORM a tabla MySQL
 *
 * **Dependencias externas**:
 * - DagsModule: Para disparar DAGs y sincronizar estado desde Airflow
 *
 * **Flujo típico**:
 * 1. Frontend POST /executions → ExecutionsController.create()
 * 2. Controller llama ExecutionsService.create()
 * 3. Service llama DagsService.triggerDag() (via DagsModule)
 * 4. Service persiste en MySQL vía TypeOrmModule
 * 5. Frontend polls GET /executions/:id/status → ExecutionsController.syncStatus()
 * 6. Controller llama ExecutionsService.syncStatus()
 * 7. Service llama DagsService.getDagRunStatus()
 * 8. Service actualiza ejecución en MySQL
 *
 * **Base de datos**:
 * - Tabla: executions
 * - Campos: id, dagId, dagRunId, parameters, status, startedAt, completedAt, result, logs, createdAt, updatedAt
 *
 * **Estados de ejecución**:
 * - queued: Creada, espera ejecución
 * - running: Ejecutándose en Airflow
 * - success: Completada exitosamente
 * - failed: Terminó con error
 */
@Module({
  imports: [TypeOrmModule.forFeature([Execution]), DagsModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService], // Para que otros módulos puedan usar ExecutionsService
})
export class ExecutionsModule {}
