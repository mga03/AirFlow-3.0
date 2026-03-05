import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Execution Entity
 *
 * Representa la ejecución de un DAG en Airflow.
 * Almacena tanto los parámetros enviados como el estado sincronizado desde Airflow.
 *
 * **Tabla**: `executions`
 *
 * **Responsabilidades**:
 * - Persistir ejecuciones de DAGs
 * - Rastrear estado de ejecución (queued, running, success, failed)
 * - Vincular con DAG runs de Airflow mediante dagRunId
 * - Guardar parámetros y resultado de ejecución
 * - Mantener registro histórico de todas las ejecuciones
 *
 * **Diferencia vs Submission**:
 * - Submission: simple almacenaje de datos enviados
 * - Execution: tracking completo de ejecución incluyendo estado y sincronización con Airflow
 *
 * **Estructura de la tabla**:
 * ```sql
 * CREATE TABLE executions (
 *   id INT PRIMARY KEY AUTO_INCREMENT,
 *   dagId VARCHAR(255) NOT NULL,
 *   dagRunId VARCHAR(300) UNIQUE,
 *   parameters JSON NOT NULL,
 *   status ENUM('queued', 'running', 'success', 'failed') DEFAULT 'queued',
 *   startedAt TIMESTAMP,
 *   completedAt TIMESTAMP,
 *   result JSON,
 *   logs LONGTEXT,
 *   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * );
 * ```
 *
 * **Estados de ejecución**:
 * - `queued`: Espera a que Airflow inicie la ejecución
 * - `running`: DAG está ejecutándose actualmente
 * - `success`: DAG completó exitosamente
 * - `failed`: DAG terminó con error
 *
 * **Ejemplo de documento**:
 * ```json
 * {
 *   "id": 1,
 *   "dagId": "informe_ventas",
 *   "dagRunId": "informe_ventas_20260305093000",
 *   "parameters": {
 *     "fecha_inicio": "2026-01-01",
 *     "fecha_fin": "2026-03-02",
 *     "region": "Norte",
 *     "top_n": 10
 *   },
 *   "status": "success",
 *   "startedAt": "2026-03-05T09:30:05Z",
 *   "completedAt": "2026-03-05T09:35:45Z",
 *   "result": {
 *     "generatedFile": "informe_ventas_20260305.pdf",
 *     "totalRows": 1250
 *   },
 *   "logs": "Starting task...",
 *   "createdAt": "2026-03-05T09:30:00Z",
 *   "updatedAt": "2026-03-05T09:35:45Z"
 * }
 * ```
 */
@Entity('executions')
export class Execution {
  /**
   * Identificador único de la ejecución.
   * Auto-increment en MySQL.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Identificador del DAG que se ejecutó.
   * Ejemplo: "informe_ventas", "reporte_usuarios"
   * Vincula a un template específico en CouchDB.
   */
  @Column({ type: 'varchar', length: 255 })
  dagId: string;

  /**
   * Identificador de la ejecución en Airflow.
   * Generado por Airflow al disparar el DAG.
   * Formato: "dagId_timestamp" (ej: "informe_ventas_20260305093000")
   * Usado para: syncronización de estado, consulta de logs, obtención de resultados.
   */
  @Column({ type: 'varchar', length: 300, nullable: true, unique: true })
  dagRunId: string;

  /**
   * Parámetros enviados por el usuario al ejecutar el formulario.
   * Tipo JSON: permite almacenar cualquier estructura de datos.
   *
   * Ejemplo:
   * ```json
   * {
   *   "fecha_inicio": "2026-01-01",
   *   "fecha_fin": "2026-03-02",
   *   "region": "Norte",
   *   "top_n": 10
   * }
   * ```
   */
  @Column({ type: 'json' })
  parameters: Record<string, any>;

  /**
   * Estado actual de la ejecución.
   * Enum con valores: 'queued' | 'running' | 'success' | 'failed'
   *
   * Estados:
   * - `queued`: Acabada de crear, espera ejecución en Airflow
   * - `running`: Actualmente ejecutándose en Airflow
   * - `success`: Completada exitosamente
   * - `failed`: Terminó con error
   *
   * **Sincronización**: Actualizado periódicamente desde Airflow.
   */
  @Column({
    type: 'enum',
    enum: ['queued', 'running', 'success', 'failed'],
    default: 'queued',
  })
  status: 'queued' | 'running' | 'success' | 'failed';

  /**
   * Fecha y hora en que Airflow inició la ejecución.
   * Se actualiza desde sincronización con Airflow.
   * NULL mientras status sea 'queued'.
   */
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  /**
   * Fecha y hora en que Airflow completó la ejecución.
   * Se actualiza desde sincronización con Airflow.
   * NULL mientras status sea 'queued' o 'running'.
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * Resultado de la ejecución como JSON.
   * Estructura definida por el DAG en Airflow.
   *
   * Ejemplo:
   * ```json
   * {
   *   "generatedFile": "informe_ventas_20260305.pdf",
   *   "totalRows": 1250,
   *   "duration": 345,
   *   "status": "completed"
   * }
   * ```
   *
   * NULL mientras status sea 'queued' o 'running'.
   */
  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  /**
   * Logs de la ejecución del DAG.
   * Texto que contiene toda la salida del proceso (stdout).
   * Se obtiene de Airflow después de completación.
   *
   * Almacenado como LONGTEXT en MySQL (límite: 4GB).
   * NULL mientras status sea 'queued' o 'running'.
   */
  @Column({ type: 'longtext', nullable: true })
  logs: string;

  /**
   * Fecha de creación del registro.
   * Se establece automáticamente al insertar.
   * Marca cuándo se inició la ejecución en el sistema.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización del registro.
   * Se actualiza automáticamente en cada modificación.
   * Importante para saber cuándo se sincronizó por última vez con Airflow.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
