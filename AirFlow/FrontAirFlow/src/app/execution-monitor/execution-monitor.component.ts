import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

/**
 * Execution Interface
 */
interface Execution {
  id: number;
  dagId: string;
  dagRunId: string;
  parameters: Record<string, any>;
  status: 'queued' | 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt: string;
  result: Record<string, any>;
  logs: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ExecutionMonitorComponent
 *
 * Componente para monitorizar el progreso de una ejecución en tiempo real.
 *
 * **Responsabilidades**:
 * - Mostrar estado actual de una ejecución
 * - Hacer polling periódico a GET /executions/:id/status
 * - Sincronizar estado desde Airflow
 * - Mostrar logs en tiempo real
 * - Mostrar progreso visual
 * - Dejar de hacer polling cuando status sea final (success/failed)
 *
 * **Flujo de usuario**:
 * 1. Usuario hace click en "Monitor" en historial
 * 2. Navega a /historial/{executionId}/monitor
 * 3. Componente carga detalles de ejecución
 * 4. Componente inicia polling cada 2 segundos
 * 5. Cada poll: GET /executions/{id}/status actualiza estado
 * 6. Cuando status = 'success' o 'failed', para polling
 * 7. Muestra resultado o error final
 *
 * **Endpoints utilizados**:
 * - GET /executions/:id - Obtiene detalles iniciales
 * - GET /executions/:id/status - Sincroniza estado (polling)
 *
 * **Base de datos involucrada**:
 * - MySQL: Lectura de ejecución y actualización de estado
 * - Airflow API: Consultas de estado (vía backend)
 *
 * **Material Components**:
 * - Progress bar: Muestra progreso (estimado basado en estado)
 * - Badge: Muestra estado actual
 * - Chips: Muestra información de tiempos
 * - Textarea: Muestra logs
 */
@Component({
  selector: 'app-execution-monitor',
  template: `
    <div class="monitor-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          ← Volver
        </button>
        <h1>Monitor de Ejecución #{{ executionId }}</h1>
        <button
          mat-icon-button
          (click)="refreshNow()"
          [disabled]="loading"
          class="refresh-button"
        >
          🔄
        </button>
      </div>

      <div *ngIf="loading && !execution" class="loading">
        <p>Cargando ejecución...</p>
      </div>

      <div *ngIf="error" class="error-message">
        <p>⚠️ {{ error }}</p>
        <button mat-raised-button (click)="loadExecution()">Reintentar</button>
      </div>

      <div *ngIf="execution" class="execution-details">
        <!-- Estado y Progreso -->
        <div class="status-section">
          <div class="status-card">
            <h2>Estado Actual</h2>
            <span class="status-badge" [ngClass]="'status-' + execution.status">
              {{ execution.status }}
            </span>
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                [style.width.%]="getProgress()"
                [ngClass]="'progress-' + execution.status"
              ></div>
            </div>
            <p class="progress-text">{{ getProgressText() }}</p>
          </div>

          <!-- Información de Tiempos -->
          <div class="info-section">
            <h3>Información de Ejecución</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">DAG ID:</span>
                <span class="value">{{ execution.dagId }}</span>
              </div>
              <div class="info-item">
                <span class="label">DAG Run ID:</span>
                <span class="value code">{{ execution.dagRunId }}</span>
              </div>
              <div class="info-item">
                <span class="label">Creado:</span>
                <span class="value">{{ execution.createdAt | date: 'medium' }}</span>
              </div>
              <div class="info-item" *ngIf="execution.startedAt">
                <span class="label">Iniciado:</span>
                <span class="value">{{ execution.startedAt | date: 'medium' }}</span>
              </div>
              <div class="info-item" *ngIf="execution.completedAt">
                <span class="label">Completado:</span>
                <span class="value">{{ execution.completedAt | date: 'medium' }}</span>
              </div>
              <div class="info-item" *ngIf="execution.startedAt && execution.completedAt">
                <span class="label">Duración:</span>
                <span class="value">{{ getDuration() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Parámetros -->
        <div class="section">
          <h3>Parámetros de Entrada</h3>
          <pre class="json-display">{{ execution.parameters | json }}</pre>
        </div>

        <!-- Resultado -->
        <div class="section" *ngIf="execution.result">
          <h3>Resultado</h3>
          <pre class="json-display">{{ execution.result | json }}</pre>
        </div>

        <!-- Logs -->
        <div class="section logs-section">
          <h3>Logs de Ejecución</h3>
          <div class="logs-container">
            <pre class="logs">{{ execution.logs || 'Sin logs disponibles' }}</pre>
          </div>
          <button
            mat-button
            (click)="downloadLogs()"
            *ngIf="execution.logs"
            class="download-btn"
          >
            ⬇️ Descargar Logs
          </button>
        </div>
      </div>

      <!-- Auto-refresh info -->
      <div *ngIf="execution && isPolling" class="auto-refresh-info">
        Actualizando estado automáticamente
        <span class="polling-indicator">●</span>
      </div>
    </div>
  `,
  styles: [`
    .monitor-container {
      padding: 2rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .header h1 {
      flex: 1;
      margin: 0;
    }

    .loading, .error-message {
      text-align: center;
      padding: 2rem;
      font-size: 16px;
    }

    .error-message {
      color: #d32f2f;
      background-color: #ffebee;
      border-radius: 4px;
    }

    .execution-details {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .status-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .status-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .status-card h2 {
      margin-top: 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      border-radius: 20px;
      color: white;
      font-weight: bold;
      font-size: 18px;
      margin: 1rem 0;
    }

    .status-queued { background: #ff9800; }
    .status-running { background: #2196f3; }
    .status-success { background: #4caf50; }
    .status-failed { background: #f44336; }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      margin: 1.5rem 0;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 4px;
    }

    .progress-queued { background: #ff9800; }
    .progress-running { background: #2196f3; }
    .progress-success { background: #4caf50; }
    .progress-failed { background: #f44336; }

    .progress-text {
      font-size: 12px;
      color: #666;
      margin: 0;
    }

    .info-section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .info-section h3 {
      margin-top: 0;
      color: #333;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      padding: 0.75rem;
      background: #fafafa;
      border-radius: 4px;
    }

    .info-item .label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .info-item .value {
      color: #333;
      font-size: 14px;
      word-break: break-all;
    }

    .info-item .code {
      font-family: monospace;
      background: #eee;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
    }

    .section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .section h3 {
      margin-top: 0;
      color: #333;
    }

    .json-display {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      font-size: 12px;
      overflow-x: auto;
      margin: 1rem 0 0 0;
    }

    .logs-section {
      margin-bottom: 3rem;
    }

    .logs-container {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1rem;
      border-radius: 4px;
      max-height: 400px;
      overflow-y: auto;
      margin: 1rem 0;
    }

    .logs {
      margin: 0;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .download-btn {
      margin-top: 1rem;
    }

    .auto-refresh-info {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #2196f3;
      color: white;
      padding: 1rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 14px;
    }

    .polling-indicator {
      display: inline-block;
      color: #4caf50;
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }

    @media (max-width: 768px) {
      .status-section {
        grid-template-columns: 1fr;
      }

      .auto-refresh-info {
        bottom: auto;
        right: auto;
        position: static;
        margin-top: 1rem;
      }
    }
  `]
})
export class ExecutionMonitorComponent implements OnInit, OnDestroy {
  executionId: number = 0;
  execution: Execution | null = null;
  loading = true;
  error: string | null = null;
  isPolling = false;
  pollSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  /**
   * Ciclo de vida: Inicialización
   */
  ngOnInit(): void {
    this.executionId = parseInt(this.route.snapshot.paramMap.get('executionId') || '0', 10);
    this.loadExecution();
    this.startPolling();
  }

  /**
   * Ciclo de vida: Destrucción
   * Detiene polling cuando el usuario sale del componente
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }

  /**
   * Carga los detalles de la ejecución.
   *
   * **Endpoint**: GET /executions/:id
   */
  loadExecution(): void {
    this.loading = true;
    this.error = null;

    this.http.get<Execution>(`http://localhost:3000/executions/${this.executionId}`)
      .subscribe({
        next: (data) => {
          this.execution = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error cargando ejecución';
          this.loading = false;
          console.error('Error loading execution:', err);
        }
      });
  }

  /**
   * Inicia el polling automático cada 2 segundos.
   * Solo polling mientras status sea 'queued' o 'running'.
   */
  startPolling(): void {
    this.isPolling = true;
    this.pollSubscription = interval(2000).subscribe(() => {
      if (!this.execution || this.execution.status === 'success' || this.execution.status === 'failed') {
        this.stopPolling();
        return;
      }

      this.syncStatus();
    });
  }

  /**
   * Detiene el polling automático.
   */
  stopPolling(): void {
    this.isPolling = false;
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  /**
   * Sincroniza el estado con Airflow.
   *
   * **Endpoint**: GET /executions/:id/status
   * Actualiza: status, startedAt, completedAt, result, logs
   */
  syncStatus(): void {
    this.http.get<Execution>(`http://localhost:3000/executions/${this.executionId}/status`)
      .subscribe({
        next: (data) => {
          this.execution = data;
        },
        error: (err) => {
          console.error('Error syncing status:', err);
        }
      });
  }

  /**
   * Realiza refresh inmediato.
   */
  refreshNow(): void {
    this.loadExecution();
    this.syncStatus();
  }

  /**
   * Calcula el porcentaje de progreso basado en estado.
   */
  getProgress(): number {
    if (!this.execution) return 0;
    switch (this.execution.status) {
      case 'queued': return 25;
      case 'running': return 75;
      case 'success': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  }

  /**
   * Obtiene descripción de progreso.
   */
  getProgressText(): string {
    const progress = this.getProgress();
    if (this.execution?.status === 'success') return 'Completada exitosamente';
    if (this.execution?.status === 'failed') return 'Falló';
    if (this.execution?.status === 'running') return 'Ejecutando...';
    return 'En cola...';
  }

  /**
   * Calcula duración de ejecución.
   */
  getDuration(): string {
    if (!this.execution?.startedAt || !this.execution?.completedAt) return '-';

    const start = new Date(this.execution.startedAt).getTime();
    const end = new Date(this.execution.completedAt).getTime();
    const diff = Math.floor((end - start) / 1000);

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Descarga logs como archivo.
   */
  downloadLogs(): void {
    if (!this.execution?.logs) return;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.execution.logs));
    element.setAttribute('download', `execution_${this.executionId}_logs.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Vuelve atrás en el route.
   */
  goBack(): void {
    this.router.navigate(['/historial']);
  }
}
