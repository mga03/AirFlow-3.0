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
    <div class="monitor-wrapper animate-up">
      <header class="monitor-header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" class="back-btn" matTooltip="Volver al Historial">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-group">
            <h1>Monitor de Ejecución <span class="hash-id">#{{ executionId }}</span></h1>
            <div *ngIf="execution && isPolling" class="poll-status">
              <span class="pulse-dot"></span>
              Sincronizando en tiempo real...
            </div>
          </div>
        </div>
        
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="refreshNow()" [disabled]="loading" class="refresh-btn">
            <mat-icon [class.rotating]="loading">refresh</mat-icon>
            Actualizar manual
          </button>
        </div>
      </header>

      <div *ngIf="loading && !execution" class="state-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Estableciendo conexión con el orquestador...</p>
      </div>

      <div *ngIf="error" class="state-container error">
        <mat-icon>report_problem</mat-icon>
        <p>{{ error }}</p>
        <button mat-stroked-button color="warn" (click)="loadExecution()">Reintentar conexión</button>
      </div>

      <div *ngIf="execution" class="monitor-grid">
        <!-- Dashboard de Estado -->
        <div class="status-grid">
          <div class="premium-card status-main">
            <div class="card-header">
              <h3>Estado del Proceso</h3>
              <span class="status-pill" [ngClass]="'status-' + execution.status">
                {{ execution.status }}
              </span>
            </div>
            
            <div class="progress-container">
              <div class="progress-details">
                <span class="pct">{{ getProgress() }}%</span>
                <span class="txt">{{ getProgressText() }}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" 
                     [style.width.%]="getProgress()" 
                     [ngClass]="'fill-' + execution.status">
                </div>
              </div>
            </div>
          </div>

          <div class="premium-card info-panel">
            <h3>Metadatos del Trabajo</h3>
            <div class="meta-list">
              <div class="meta-item">
                <span class="label">Identificador DAG</span>
                <span class="value"><code>{{ execution.dagId }}</code></span>
              </div>
              <div class="meta-item">
                <span class="label">Airflow Run ID</span>
                <span class="value code-val">{{ execution.dagRunId | slice:0:24 }}...</span>
              </div>
              <div class="meta-item" *ngIf="execution.startedAt">
                <span class="label">Desde Inicio</span>
                <span class="value">{{ execution.startedAt | date: 'HH:mm:ss' }}</span>
              </div>
              <div class="meta-item" *ngIf="execution.startedAt && execution.completedAt">
                <span class="label">Tiempo Total</span>
                <span class="value highlight">{{ getDuration() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consola de Logs -->
        <div class="premium-card console-card">
          <div class="console-header">
            <div class="c-title">
              <mat-icon>terminal</mat-icon>
              <h3>Salida Estándar (Logs)</h3>
            </div>
            <button mat-button color="accent" (click)="downloadLogs()" *ngIf="execution.logs">
              <mat-icon>download</mat-icon> Descargar Registro
            </button>
          </div>
          
          <div class="console-body" #scrollContainer>
            <pre class="terminal-text">{{ execution.logs || '> Esperando salida del proceso...' }}</pre>
          </div>
        </div>

        <!-- Parámetros de Configuración (Compacto) -->
        <div class="premium-card params-card">
          <h3>Configuración de Lanzamiento</h3>
          <pre class="params-json">{{ execution.parameters | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-wrapper {
      padding: 3rem 2rem;
      max-width: 1300px;
      margin: 0 auto;
    }

    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .back-btn { background: var(--bg-card); border: 1px solid var(--border-color); }

    .title-group h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem;
      color: var(--secondary);
    }

    .hash-id { color: var(--primary); font-family: monospace; }

    .poll-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--accent);
      font-weight: 600;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse-sm 2s infinite;
    }

    @keyframes pulse-sm {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 93, 227, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(79, 93, 227, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79, 93, 227, 0); }
    }

    .rotating { animation: spin 2s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6rem;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      gap: 2rem;
    }

    .monitor-grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .status-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 2rem;
    }

    .status-main { padding: 2.5rem; }

    .status-main .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
    }

    .status-main h3 { margin: 0; color: var(--text-muted); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }

    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .pct { font-size: 3rem; font-weight: 800; color: var(--secondary); }
    .txt { font-size: 1.1rem; color: var(--text-muted); font-weight: 500; }

    .progress-track {
      height: 12px;
      background: var(--bg-main);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill { height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
    .fill-queued { background: var(--warning); }
    .fill-running { background: var(--accent); }
    .fill-success { background: var(--success); }
    .fill-failed { background: var(--danger); }

    .info-panel { padding: 2rem; }
    .info-panel h3 { margin-bottom: 1.5rem; font-size: 1rem; }

    .meta-list { display: flex; flex-direction: column; gap: 1rem; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid var(--bg-main); padding-bottom: 0.5rem; }
    .meta-item:last-child { border: none; }
    .meta-item .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
    .meta-item .value { font-size: 0.9rem; font-weight: 600; color: var(--secondary); }
    .meta-item code { background: var(--bg-main); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
    .code-val { font-family: monospace; color: var(--primary); }
    .highlight { color: var(--primary) !important; }

    /* Console */
    .console-card { background: #0f172a; border-color: #1e293b; color: #e2e8f0; padding: 0; overflow: hidden; }
    
    .console-header {
      padding: 1rem 1.5rem;
      background: #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }

    .c-title { display: flex; align-items: center; gap: 10px; }
    .c-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }
    .c-title h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; }

    .console-body {
      padding: 1.5rem;
      max-height: 500px;
      overflow-y: auto;
      background: #0f172a;
    }

    .terminal-text {
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: #cbd5e1;
      white-space: pre-wrap;
    }

    .params-card { padding: 1.5rem; }
    .params-json { background: var(--bg-main); padding: 1rem; border-radius: 8px; font-size: 0.8rem; margin: 1rem 0 0; }

    .status-pill {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-success { background: #1a4731; color: #4ade80; }
    .status-failed { background: #471a1a; color: #f87171; }
    .status-running { background: #1e293b; color: #60a5fa; }
    .status-queued { background: #422006; color: #facc15; }

    @media (max-width: 1024px) {
      .status-grid { grid-template-columns: 1fr; }
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
  ) { }

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
