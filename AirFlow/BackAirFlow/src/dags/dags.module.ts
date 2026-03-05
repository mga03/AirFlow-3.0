import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DagsController } from './dags.controller';
import { DagsService } from './dags.service';

/**
 * DagsModule
 *
 * Módulo encargado de la integración con Airflow.
 *
 * **Responsabilidades**:
 * - Proveer endpoints REST para listar y disparar DAGs
 * - Proveer servicio para sincronizar estado con Airflow
 * - Gestionar autenticación y conexión con Airflow API
 *
 * **Componentes**:
 * - DagsController: Endpoints REST (GET /dags, POST /dags/:dagId/trigger)
 * - DagsService: Lógica de Airflow (listDags, triggerDag, getDagRunStatus, getDagRunLogs)
 *
 * **Dependencias externas**:
 * - HttpModule: Para comunicación HTTP con Airflow API
 *
 * **Configuración Airflow**:
 * - AIRFLOW_API: URL base (env: http://10.236.197.9:8080/api/v1)
 * - AIRFLOW_USER: Usuario para autenticación básica
 * - AIRFLOW_PASSWORD: Contraseña para autenticación básica
 *
 * **Exporta**:
 * - DagsService: Usado por ExecutionsModule para sincronización de estado
 *
 * **Flujo típico**:
 * 1. Frontend POST /dags/{dagId}/trigger con parámetros
 * 2. DagsController.triggerDag() recibe solicitud
 * 3. DagsService.triggerDag() dispara en Airflow
 * 4. Airflow crea DagRun y devuelve dag_run_id
 * 5. ExecutionsService recibe dag_run_id y lo persiste
 * 6. Frontend polling GET /executions/{id}/status
 * 7. ExecutionsService.syncStatus() llama a DagsService.getDagRunStatus()
 * 8. DagsService consulta Airflow y devuelve estado
 * 9. ExecutionsService actualiza registro en MySQL
 */
@Module({
  imports: [HttpModule],
  controllers: [DagsController],
  providers: [DagsService],
  exports: [DagsService], // ← Exportar para que otros módulos puedan usarlo
})
export class DagsModule {}


