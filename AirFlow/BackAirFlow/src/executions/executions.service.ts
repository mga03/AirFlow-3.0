import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Execution } from './entities/execution.entity';
import { DagsService } from '../dags/dags.service';

/**
 * ExecutionsService
 *
 * Servicio encargado de la gestión completa del ciclo de vida de ejecuciones de DAGs.
 *
 * **Responsabilidades**:
 * - Crear nuevas ejecuciones registrando parámetros
 * - Disparar DAGs en Airflow y vincular con dagRunId
 * - Sincronizar estado desde Airflow
 * - Recuperar historial de ejecuciones
 * - Obtener logs y resultados de Airflow
 *
 * **Bases de datos**:
 * - MySQL: Almacenamiento persistente de ejecuciones
 * - Airflow API: Consulta de estado, logs y resultados en tiempo real
 *
 * **Flujo típico de una ejecución**:
 * 1. Usuario envía formulario → create() crea Execution con status 'queued'
 * 2. create() dispara DAG en Airflow via DagsService
 * 3. Airflow devuelve dagRunId
 * 4. Se guarda dagRunId en la ejecución
 * 5. Frontend pregunta por estado → syncStatus() consulta Airflow
 * 6. syncStatus() actualiza status, startedAt, completedAt, result, logs
 * 7. Workflow se sincroniza periódicamente o por demanda
 *
 * **Estados**:
 * - queued: Creada, esperando ejecución
 * - running: Ejecutándose en Airflow
 * - success: Completada exitosamente
 * - failed: Terminó con error
 */
@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  /**
   * Constructor que inyecta el Repository de TypeORM y DagsService.
   *
   * @param executionRepository - Repository para operaciones CRUD en executions
   * @param dagsService - Servicio para interactuar con Airflow
   */
  constructor(
    @InjectRepository(Execution)
    private executionRepository: Repository<Execution>,
    private dagsService: DagsService,
  ) {}

  /**
   * CREATE: Crea una nueva ejecución, dispara el DAG en Airflow y registra el dagRunId.
   *
   * **Flujo**:
   * 1. Crea registro de Execution en MySQL con status 'queued'
   * 2. Dispara DAG en Airflow vía DagsService.triggerDag()
   * 3. Obtiene dagRunId devuelto por Airflow
   * 4. Actualiza execution con dagRunId
   * 5. Devuelve execution al frontend
   *
   * @param dagId - Identificador del DAG (ej: "informe_ventas")
   * @param parameters - Parámetros del formulario
   * @returns Objeto Execution creado y guardado
   *
   * @throws Error si falla el disparo en Airflow
   *
   * **Ejemplo de uso**:
   * ```typescript
   * const execution = await executionsService.create('informe_ventas', {
   *   fecha_inicio: '2026-01-01',
   *   fecha_fin: '2026-03-02',
   *   region: 'Norte',
   *   top_n: 10
   * });
   * // Devuelve: {
   * //   id: 1,
   * //   dagId: 'informe_ventas',
   * //   parameters: {...},
   * //   status: 'queued',
   * //   dagRunId: 'informe_ventas_20260305093000',
   * //   createdAt, updatedAt, ...
   * // }
   * ```
   */
  async create(
    dagId: string,
    parameters: Record<string, any>,
  ): Promise<Execution> {
    this.logger.log(`Creating execution for DAG: ${dagId}`);

    // 1. Crear execution inicial con status 'queued'
    const execution = this.executionRepository.create({
      dagId,
      parameters,
      status: 'queued',
    });

    // Guardar para obtener ID
    const savedExecution = await this.executionRepository.save(execution);
    this.logger.log(`Execution created with ID: ${savedExecution.id}`);

    try {
      // 2. Disparar DAG en Airflow
      const dagRunResponse = await this.dagsService.triggerDag(dagId, parameters);
      const dagRunId = dagRunResponse.dag_run_id;

      this.logger.log(`DAG triggered successfully. DagRunId: ${dagRunId}`);

      // 3. Actualizar execution con dagRunId
      savedExecution.dagRunId = dagRunId;
      await this.executionRepository.save(savedExecution);

      return savedExecution;
    } catch (error) {
      this.logger.error(
        `Failed to trigger DAG ${dagId} for execution ${savedExecution.id}`,
        error,
      );
      // La ejecución queda registrada pero con estado 'queued'
      // El frontend debería mostrar error al usuario
      throw error;
    }
  }

  /**
   * READ: Obtiene TODAS las ejecuciones, ordenadas por fecha de creación descendente.
   *
   * @returns Array de objetos Execution ordenados por más reciente primero
   *
   * **Respuesta típica**:
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
   */
  async findAll(): Promise<Execution[]> {
    return this.executionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * READ: Obtiene una ejecución específica por su ID.
   *
   * @param id - ID numérico de la ejecución
   * @returns Objeto Execution si existe
   * @throws NotFoundException si el ID no existe
   *
   * **Ejemplo de uso**:
   * ```typescript
   * const execution = await executionsService.findOne(1);
   * // Devuelve: { id: 1, dagId: 'informe_ventas', status: 'success', ... }
   * ```
   */
  async findOne(id: number): Promise<Execution> {
    const execution = await this.executionRepository.findOne({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    return execution;
  }

  /**
   * SYNC: Sincroniza el estado de una ejecución con Airflow.
   *
   * Consulta Airflow para obtener el estado actual del DAG run y actualiza la ejecución.
   *
   * **Flujo**:
   * 1. Obtiene la ejecución desde MySQL
   * 2. Si no tiene dagRunId, no se puede sincronizar
   * 3. Consulta Airflow por estado del dagRunId
   * 4. Actualiza: status, startedAt, completedAt, result
   * 5. Si completada, obtiene logs desde Airflow
   * 6. Guarda cambios en MySQL
   * 7. Devuelve ejecución actualizada
   *
   * @param id - ID de la ejecución a sincronizar
   * @returns Ejecución con estado sincronizado desde Airflow
   * @throws NotFoundException si la ejecución no existe
   * @throws Error si falla la consulta a Airflow
   *
   * **Ejemplo de uso**:
   * ```typescript
   * // Antes de sincronizar
   * { status: 'queued', startedAt: null, completedAt: null }
   *
   * // Después de sincronizar
   * { status: 'success', startedAt: '2026-03-05T09:30:05Z', completedAt: '2026-03-05T09:35:45Z' }
   * ```
   */
  async syncStatus(id: number): Promise<Execution> {
    const execution = await this.findOne(id);

    if (!execution.dagRunId) {
      this.logger.warn(`Execution ${id} has no dagRunId, cannot sync with Airflow`);
      return execution;
    }

    try {
      this.logger.log(`Syncing status for execution ${id} with dagRunId ${execution.dagRunId}`);

      // Obtener estado desde Airflow
      const dagRunStatus = await this.dagsService.getDagRunStatus(
        execution.dagId,
        execution.dagRunId,
      );

      // Actualizar campos desde respuesta de Airflow
      execution.status = dagRunStatus.state; // 'queued', 'running', 'success', 'failed'
      execution.startedAt = dagRunStatus.start_date
        ? new Date(dagRunStatus.start_date)
        : null;
      execution.completedAt = dagRunStatus.end_date
        ? new Date(dagRunStatus.end_date)
        : null;

      // Si completada, obtener logs y resultado
      if (execution.status === 'success' || execution.status === 'failed') {
        const logs = await this.dagsService.getDagRunLogs(
          execution.dagId,
          execution.dagRunId,
        );
        execution.logs = logs;

        // Intentar obtener resultado (opcional, depende de Airflow)
        if (dagRunStatus.conf) {
          execution.result = dagRunStatus.conf;
        }
      }

      await this.executionRepository.save(execution);

      this.logger.log(
        `Execution ${id} synced successfully. New status: ${execution.status}`,
      );

      return execution;
    } catch (error) {
      this.logger.error(
        `Failed to sync execution ${id} with Airflow`,
        error,
      );
      // Devuelve ejecución con estado anterior
      // El frontend debería reintentar later
      throw error;
    }
  }

  /**
   * UPDATE: Actualiza campos específicos de una ejecución.
   *
   * @param id - ID de la ejecución
   * @param data - Objeto parcial con campos a actualizar
   * @returns Ejecución actualizada
   * @throws NotFoundException si no existe
   *
   * **Ejemplo de uso**:
   * ```typescript
   * // Actualizar estado manualmente (raro, generalmente sync lo hace)
   * await executionsService.update(1, { status: 'failed' });
   * ```
   */
  async update(
    id: number,
    data: Partial<Execution>,
  ): Promise<Execution> {
    await this.executionRepository.update(id, data);
    return this.findOne(id);
  }

  /**
   * DELETE: Elimina una ejecución (operación rara, se mantiene para completitud).
   *
   * En producción, típicamente no se eliminan ejecuciones (solo se archivan).
   *
   * @param id - ID de la ejecución a eliminar
   * @throws NotFoundException si no existe
   */
  async remove(id: number): Promise<void> {
    const result = await this.executionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    this.logger.log(`Execution ${id} deleted`);
  }

  /**
   * QUERY: Obtiene ejecuciones filtradas por dagId.
   *
   * Útil para historial de un informe específico.
   *
   * @param dagId - Identificador del DAG
   * @returns Array de executions para ese DAG, ordenadas por más reciente
   *
   * **Ejemplo de uso**:
   * ```typescript
   * const ventas = await executionsService.findByDagId('informe_ventas');
   * // Devuelve todas las ejecuciones de informe_ventas
   * ```
   */
  async findByDagId(dagId: string): Promise<Execution[]> {
    return this.executionRepository.find({
      where: { dagId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * STATS: Obtiene estadísticas de ejecuciones.
   *
   * Útil para dashboard: cuántas exitosas, cuántas fallidas, etc.
   *
   * @returns Objeto con conteos por estado
   *
   * **Ejemplo de respuesta**:
   * ```json
   * {
   *   "total": 10,
   *   "queued": 1,
   *   "running": 2,
   *   "success": 6,
   *   "failed": 1
   * }
   * ```
   */
  async getStats(): Promise<{
    total: number;
    queued: number;
    running: number;
    success: number;
    failed: number;
  }> {
    const total = await this.executionRepository.count();
    const queued = await this.executionRepository.count({
      where: { status: 'queued' },
    });
    const running = await this.executionRepository.count({
      where: { status: 'running' },
    });
    const success = await this.executionRepository.count({
      where: { status: 'success' },
    });
    const failed = await this.executionRepository.count({
      where: { status: 'failed' },
    });

    return { total, queued, running, success, failed };
  }
}
