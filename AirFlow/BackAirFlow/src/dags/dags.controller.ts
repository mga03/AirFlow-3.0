import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { DagsService } from './dags.service';
import { TriggerDagDto } from './dto/trigger-dag.dto';

/**
 * DagsController
 *
 * Controlador REST que expone endpoints para interactuar con Airflow.
 *
 * **Responsabilidades**:
 * - Listar DAGs activos en Airflow
 * - Disparar ejecuciones de DAGs
 *
 * **Endpoints**:
 * - GET /dags              → Obtener lista de DAGs activos
 * - POST /dags/:dagId/trigger → Disparar un DAG
 *
 * **Flujo típico**:
 * 1. Frontend GET /dags para mostrar catálogo de informes
 * 2. Usuario selecciona un informe (dagId)
 * 3. Frontend POST /dags/{dagId}/trigger con parámetros
 * 4. Backend ejecuta DagRun en Airflow
 * 5. Devuelve dagRunId para tracking
 *
 * **NOTA**: Este controlador se mantiene para compatibilidad.
 * Para crear ejecuciones modernas, usar ExecutionsController (POST /executions).
 */
@Controller('dags')
export class DagsController {
  /**
   * Constructor que inyecta DagsService.
   *
   * @param dagsService - Servicio para operaciones con Airflow
   */
  constructor(private readonly dagsService: DagsService) {}

  /**
   * GET /dags
   *
   * Obtiene la lista de todos los DAGs activos en Airflow.
   *
   * **Flujo**:
   * 1. Llama a DagsService.listDags()
   * 2. Service consulta Airflow: GET /dags?only_active=true
   * 3. Devuelve array de DAGs con información
   *
   * **Respuesta esperada**:
   * ```json
   * [
   *   {
   *     "dag_id": "informe_ventas",
   *     "description": "Genera informe de ventas diario",
   *     "is_active": true,
   *     "owner": "airflow"
   *   },
   *   {
   *     "dag_id": "reporte_usuarios",
   *     "description": "Genera reporte de usuarios activos",
   *     "is_active": true,
   *     "owner": "airflow"
   *   }
   * ]
   * ```
   *
   * **Frontend**: GET http://localhost:3000/dags
   * Usado para: Mostrar catálogo de informes disponibles
   */
  @Get()
  getDags() {
    return this.dagsService.listDags();
  }

  /**
   * POST /dags/:dagId/trigger
   *
   * Dispara un DagRun en Airflow para un DAG específico.
   *
   * **NOTA**: Este endpoint es DEPRECADO. Usar POST /executions en su lugar.
   * Este endpoint no persiste la ejecución en MySQL.
   *
   * **Flujo**:
   * 1. Recibe dagId de la ruta y parámetros del body
   * 2. Llama a DagsService.triggerDag()
   * 3. Service dispara DAG en Airflow
   * 4. Airflow crea DagRun y devuelve información
   * 5. Controller devuelve respuesta
   *
   * **Para crear ejecuciones con persistencia**:
   * Usar POST /executions que:
   * - Persiste en MySQL (tabla executions)
   * - Dispara DAG en Airflow
   * - Sincroniza estado periódicamente
   *
   * @param dagId - Identificador del DAG (ej: "informe_ventas")
   * @param dto - Objeto con parámetros del DAG
   *
   * **Payload esperado**:
   * ```json
   * {
   *   "fecha_inicio": "2026-01-01",
   *   "fecha_fin": "2026-03-02",
   *   "region": "Norte"
   * }
   * ```
   *
   * **Respuesta esperada**:
   * ```json
   * {
   *   "dag_id": "informe_ventas",
   *   "dag_run_id": "informe_ventas_20260305093000",
   *   "execution_date": "2026-03-05T09:30:00Z",
   *   "state": "queued",
   *   "conf": {...}
   * }
   * ```
   *
   * **DEPRECADO**: Mejor usar POST /executions
   * ```
   * POST /executions
   * { "dagId": "informe_ventas", "parameters": {...} }
   * ```
   */
  @Post(':dagId/trigger')
  triggerDag(@Param('dagId') dagId: string, @Body() dto: TriggerDagDto) {
    return this.dagsService.triggerDag(dagId, dto);
  }
}
