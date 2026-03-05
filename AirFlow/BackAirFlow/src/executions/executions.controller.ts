import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ExecutionsService } from './executions.service';

/**
 * CreateExecutionDto
 * DTO (Data Transfer Object) para validar datos de entrada.
 * Define qué datos se esperan cuando se crea una ejecución.
 */
interface CreateExecutionDto {
  dagId: string;
  parameters: Record<string, any>;
}

/**
 * ExecutionsController
 *
 * Controlador REST que expone endpoints para gestionar ejecuciones de DAGs.
 *
 * **Responsabilidades**:
 * - Crear nuevas ejecuciones (POST /executions)
 * - Recuperar historial de ejecuciones (GET /executions)
 * - Obtener detalles de una ejecución (GET /executions/:id)
 * - Sincronizar estado con Airflow (GET /executions/:id/status)
 * - Obtener estadísticas (GET /executions/stats/overview)
 * - Eliminar ejecuciones (DELETE /executions/:id)
 *
 * **Flujo típico**:
 * 1. Frontend POST /executions con { dagId, parameters }
 * 2. Controller llama a ExecutionsService.create()
 * 3. Service dispara DAG en Airflow y devuelve execution
 * 4. Frontend puede polls GET /executions/:id/status para sincronizar
 * 5. Estado se actualiza desde Airflow periódicamente
 *
 * **Endpoints**:
 * - POST /executions                 → Crear ejecución y disparar DAG
 * - GET /executions                  → Obtener historial completo
 * - GET /executions/:id              → Obtener una ejecución
 * - GET /executions/:id/status       → Sincronizar estado con Airflow
 * - GET /executions/stats/overview   → Estadísticas agregadas
 * - DELETE /executions/:id           → Eliminar ejecución
 */
@Controller('executions')
export class ExecutionsController {
  /**
   * Constructor que inyecta ExecutionsService.
   *
   * @param executionsService - Servicio para gestión de ejecuciones
   */
  constructor(private readonly executionsService: ExecutionsService) {}

  /**
   * POST /executions
   *
   * Crea una nueva ejecución, dispara el DAG en Airflow y registra la ejecución en MySQL.
   *
   * **Flujo**:
   * 1. Valida datos de entrada (dagId, parameters)
   * 2. Llama a ExecutionsService.create()
   * 3. Service crea registro en MySQL con status 'queued'
   * 4. Service dispara DAG en Airflow
   * 5. Service obtiene dagRunId de Airflow y lo guarda
   * 6. Devuelve execution al frontend
   *
   * **Payload esperado**:
   * ```json
   * {
   *   "dagId": "informe_ventas",
   *   "parameters": {
   *     "fecha_inicio": "2026-01-01",
   *     "fecha_fin": "2026-03-02",
   *     "region": "Norte",
   *     "top_n": 10
   *   }
   * }
   * ```
   *
   * **Respuesta exitosa (201)**:
   * ```json
   * {
   *   "id": 1,
   *   "dagId": "informe_ventas",
   *   "parameters": {...},
   *   "status": "queued",
   *   "dagRunId": "informe_ventas_20260305093000",
   *   "startedAt": null,
   *   "completedAt": null,
   *   "result": null,
   *   "logs": null,
   *   "createdAt": "2026-03-05T09:30:00Z",
   *   "updatedAt": "2026-03-05T09:30:00Z"
   * }
   * ```
   *
   * **Respuesta de error**:
   * - 400: dagId o parameters faltantes
   * - 500: Error al disparar DAG en Airflow
   */
  @Post()
  async create(@Body() createExecutionDto: CreateExecutionDto) {
    // Validar campos requeridos
    if (!createExecutionDto.dagId || !createExecutionDto.parameters) {
      throw new BadRequestException(
        'dagId and parameters are required',
      );
    }

    return this.executionsService.create(
      createExecutionDto.dagId,
      createExecutionDto.parameters,
    );
  }

  /**
   * GET /executions
   *
   * Devuelve el historial completo de ejecuciones ordenadas por fecha descendente.
   *
   * **Respuesta esperada**:
   * ```json
   * [
   *   {
   *     "id": 3,
   *     "dagId": "reporte_usuarios",
   *     "dagRunId": "reporte_usuarios_20260305094500",
   *     "parameters": {...},
   *     "status": "running",
   *     "startedAt": "2026-03-05T09:45:10Z",
   *     "completedAt": null,
   *     "createdAt": "2026-03-05T09:45:00Z"
   *   },
   *   {
   *     "id": 2,
   *     "dagId": "informe_ventas",
   *     "dagRunId": "informe_ventas_20260305093000",
   *     "parameters": {...},
   *     "status": "success",
   *     "startedAt": "2026-03-05T09:30:05Z",
   *     "completedAt": "2026-03-05T09:35:45Z",
   *     "createdAt": "2026-03-05T09:30:00Z"
   *   }
   * ]
   * ```
   *
   * **Frontend**: GET http://localhost:3000/executions
   */
  @Get()
  async findAll() {
    return this.executionsService.findAll();
  }

  /**
   * GET /executions/stats/overview
   *
   * Devuelve estadísticas agregadas de ejecuciones.
   * NOTA: Debe ir ANTES de GET /executions/:id porque es ruta más específica.
   *
   * **Respuesta esperada**:
   * ```json
   * {
   *   "total": 10,
   *   "queued": 1,
   *   "running": 2,
   *   "success": 6,
   *   "failed": 1
   * }
   * ```
   *
   * **Frontend**: GET http://localhost:3000/executions/stats/overview
   */
  @Get('stats/overview')
  async getStats() {
    return this.executionsService.getStats();
  }

  /**
   * GET /executions/:id
   *
   * Obtiene los detalles de una ejecución específica por su ID.
   *
   * @param id - ID numérico de la ejecución
   *
   * **Respuesta esperada**:
   * ```json
   * {
   *   "id": 1,
   *   "dagId": "informe_ventas",
   *   "dagRunId": "informe_ventas_20260305093000",
   *   "parameters": {...},
   *   "status": "success",
   *   "startedAt": "2026-03-05T09:30:05Z",
   *   "completedAt": "2026-03-05T09:35:45Z",
   *   "result": {...},
   *   "logs": "...",
   *   "createdAt": "2026-03-05T09:30:00Z",
   *   "updatedAt": "2026-03-05T09:35:45Z"
   * }
   * ```
   *
   * **Errores**:
   * - 404: Ejecución no encontrada
   *
   * **Frontend**: GET http://localhost:3000/executions/1
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findOne(parseInt(id, 10));
  }

  /**
   * GET /executions/:id/status
   *
   * Sincroniza el estado de una ejecución con Airflow.
   *
   * **Flujo**:
   * 1. Obtiene ejecución desde MySQL
   * 2. Consulta Airflow por dagRunId
   * 3. Actualiza status, startedAt, completedAt, logs, result
   * 4. Guarda cambios en MySQL
   * 5. Devuelve ejecución actualizada
   *
   * **Uso principal**: Frontend hace polling a este endpoint cada X segundos
   * mientras status sea 'queued' o 'running'.
   *
   * @param id - ID numérico de la ejecución
   *
   * **Respuesta esperada**:
   * ```json
   * {
   *   "id": 1,
   *   "dagId": "informe_ventas",
   *   "dagRunId": "informe_ventas_20260305093000",
   *   "status": "success",
   *   "startedAt": "2026-03-05T09:30:05Z",
   *   "completedAt": "2026-03-05T09:35:45Z",
   *   "result": {...},
   *   "logs": "...",
   *   ...
   * }
   * ```
   *
   * **Errores**:
   * - 404: Ejecución no encontrada
   * - 500: Error al consultar Airflow
   *
   * **Frontend**: GET http://localhost:3000/executions/1/status
   * Llamado frecuentemente (cada 2-5 segundos) para monitorizar progreso.
   *
   * **Optimización**: Frontend debe dejar de hacer polling cuando status sea
   * 'success' o 'failed'.
   */
  @Get(':id/status')
  async syncStatus(@Param('id') id: string) {
    return this.executionsService.syncStatus(parseInt(id, 10));
  }

  /**
   * DELETE /executions/:id
   *
   * Elimina una ejecución.
   *
   * NOTA: En producción tipicamente NO se eliminan ejecuciones,
   * solo se archivan o marcan como obsoletas.
   * Este endpoint se mantiene para completitud.
   *
   * @param id - ID numérico de la ejecución
   *
   * **Respuesta exitosa (200)**:
   * ```json
   * { "message": "Execution deleted successfully" }
   * ```
   *
   * **Errores**:
   * - 404: Ejecución no encontrada
   *
   * **Frontend**: DELETE http://localhost:3000/executions/1
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.executionsService.remove(parseInt(id, 10));
    return { message: 'Execution deleted successfully' };
  }
}
