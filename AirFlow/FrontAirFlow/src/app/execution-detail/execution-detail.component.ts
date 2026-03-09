import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/**
 * Estado de una ejecución de DAG
 * 
 * **Estados posibles**:
 * - queued: Esperando en Airflow para ejecutarse
 * - running: Actualmente ejecutándose en Airflow
 * - success: Completada exitosamente
 * - failed: Falló durante ejecución
 * - skipped: Saltada (por configuración)
 * - upstream_failed: Falló un task upstream
 */
interface Execution {
  id: number;
  dagId: string;
  dagRunId: string;
  parameters: any;
  status: 'queued' | 'running' | 'success' | 'failed' | 'skipped' | 'upstream_failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  logs?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ExecutionDetailComponent
 *
 * Componente para visualizar detalles completos de una ejecución.
 *
 * **Responsabilidades**:
 * - Cargar detalles de una ejecución específica
 * - Mostrar parámetros de entrada y resultado
 * - Mostrar logs completos con posibilidad de descargar
 * - Mostrar timeline de ejecución (creado, iniciado, completado)
 * - Permitir copiar información al portapapeles
 * - Permitir volver al histórico
 * - Sincronizar estado con Airflow si la ejecución está en progreso
 *
 * **Flujo de usuario**:
 * 1. Usuario accede a /historial/:executionId/detalle
 * 2. Componente GET /executions/:executionId
 * 3. Muestra detalles completos: parámetros, logs, resultado
 * 4. Si status está en progreso (queued/running), permite sincronizar
 * 5. Permite descargar logs como archivo .txt
 * 6. Permite volver a /historial
 *
 * **Endpoints utilizados**:
 * - GET /executions/:executionId - Obtener ejecución
 * - GET /executions/:executionId/status - Sincronizar estado actual
 *
 * **Bases de datos involucradas**:
 * - MySQL: Lectura de ejecución
 * - Airflow: Sincronización de estado opcional
 */
@Component({
  selector: 'app-execution-detail',
  templateUrl: './execution-detail.component.html',
  styleUrls: ['./execution-detail.component.css']
})
export class ExecutionDetailComponent implements OnInit {
  /**
   * Ejecución cargada desde MySQL
   * Contiene todos los detalles: parámetros, logs, resultado, estado
   */
  execution!: Execution;

  /**
   * ID de la ejecución obtenido de la ruta
   * Ejemplo: /historial/42/detalle → executionId = 42
   */
  executionId!: number;

  /**
   * Estado de carga del componente
   */
  loading = true;

  /**
   * Indicador de sincronización con Airflow
   */
  synchronizing = false;

  /**
   * Mensaje de éxito/error después de sincronizar
   */
  syncMessage = '';

  /**
   * Sección actualmente expandida (parámetros, resultado, logs)
   * Por defecto muestra parámetros
   */
  activeSection: 'parameters' | 'result' | 'logs' = 'parameters';

  /**
   * Mensaje de "copiado" temporal
   */
  copyMessage: { [key: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  /**
   * Ciclo de vida: Inicialización
   *
   * Flujo:
   * 1. Obtiene ID de la ejecución desde ruta
   * 2. Carga ejecución desde MySQL
   * 3. Si hay error, navega atrás
   */
  ngOnInit(): void {
    this.executionId = parseInt(this.route.snapshot.paramMap.get('executionId') || '0', 10);
    if (!this.executionId) {
      alert('Ejecución no especificada');
      this.router.navigate(['/historial']);
      return;
    }
    this.loadExecution();
  }

  /**
   * Carga una ejecución desde MySQL.
   *
   * **Endpoint**: GET /executions/:executionId
   * **Base de datos**: MySQL
   *
   * Flujo:
   * 1. GET /executions/{executionId}
   * 2. Si éxito: muestra detalles
   * 3. Si error (404): navega a /historial
   */
  loadExecution(): void {
    this.loading = true;
    this.http.get<Execution>(`http://localhost:3000/executions/${this.executionId}`)
      .subscribe({
        next: (execution) => {
          this.execution = execution;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading execution:', err);
          alert('No se encontró la ejecución');
          this.router.navigate(['/historial']);
        }
      });
  }

  /**
   * Sincroniza el estado desde Airflow.
   *
   * **Endpoint**: GET /executions/:executionId/status
   *
   * Flujo:
   * 1. GET /executions/{executionId}/status
   * 2. Backend consulta Airflow y actualiza MySQL
   * 3. Retorna ejecución actualizada
   * 4. Muestra mensaje de éxito
   *
   * Uso: Cuando status es 'queued' o 'running', permite sincronizar manualmente
   */
  syncStatus(): void {
    this.synchronizing = true;
    this.syncMessage = '';

    this.http.get<Execution>(`http://localhost:3000/executions/${this.executionId}/status`)
      .subscribe({
        next: (updated) => {
          this.execution = updated;
          this.synchronizing = false;
          this.syncMessage = 'Estado sincronizado con Airflow';
          setTimeout(() => this.syncMessage = '', 3000);
        },
        error: (err) => {
          this.synchronizing = false;
          this.syncMessage = 'Error sincronizando: ' + (err?.error?.message || 'Unknown error');
          setTimeout(() => this.syncMessage = '', 3000);
        }
      });
  }

  /**
   * Descarga los logs como archivo .txt
   *
   * Flujo:
   * 1. Crea un blob con los logs
   * 2. Crea URL de descarga
   * 3. Simula clic para descargar
   * 4. Limpia recursos
   */
  downloadLogs(): void {
    if (!this.execution.logs) {
      alert('No hay logs disponibles');
      return;
    }

    const element = document.createElement('a');
    const file = new Blob([this.execution.logs], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `execution_${this.executionId}_logs.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  }

  /**
   * Copia texto al portapapeles y muestra mensaje temporal.
   *
   * @param text - Texto a copiar
   * @param key - Identificador para el mensaje
   */
  copyToClipboard(text: string, key: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copyMessage[key] = true;
      setTimeout(() => this.copyMessage[key] = false, 2000);
    });
  }

  /**
   * Vuelve a /historial
   */
  goBack(): void {
    this.router.navigate(['/historial']);
  }

  /**
   * Obtiene descripción textual del estado
   *
   * @param status - Estado de la ejecución
   * @returns Descripción en español
   */
  getStatusDescription(status: string): string {
    const descriptions: { [key: string]: string } = {
      'queued': 'Esperando ejecución',
      'running': 'En progreso',
      'success': 'Completada exitosamente',
      'failed': 'Falló durante ejecución',
      'skipped': 'Saltada',
      'upstream_failed': 'Falló upstream'
    };
    return descriptions[status] || status;
  }

  /**
   * Calcula duración de la ejecución en formato "Xm Ys"
   *
   * @returns String con duración, o vacío si no completada
   */
  getDuration(): string {
    if (!this.execution.startedAt || !this.execution.completedAt) {
      return '';
    }
    const start = new Date(this.execution.startedAt).getTime();
    const end = new Date(this.execution.completedAt).getTime();
    const diffMs = end - start;

    const diffSecs = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Calcula tiempo desde creación a ahora o completado
   *
   * @returns String con tiempo transcurrido
   */
  getAge(): string {
    const created = new Date(this.execution.createdAt).getTime();
    const now = this.execution.completedAt
      ? new Date(this.execution.completedAt).getTime()
      : Date.now();

    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    if (diffMins > 0) return `${diffMins}m atrás`;
    return 'Hacía poco';
  }

  /**
   * Marca si un JSON es grande (> 500 chars)
   * Para mostrar pre con scroll
   */
  isLargeJson(obj: any): boolean {
    return JSON.stringify(obj).length > 500;
  }

  /**
   * Necesario para usar Object.keys en el template HTML
   */
  Object = Object;
}
