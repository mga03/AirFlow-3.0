import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/**
 * Execution Interface
 * Define la estructura de una ejecución.
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
 * ExecutionHistoryComponent
 *
 * Componente que muestra el historial completo de ejecuciones.
 *
 * **Responsabilidades**:
 * - Cargar historial de ejecuciones desde MySQL vía backend
 * - Mostrar tabla/lista de ejecuciones pasadas
 * - Permitir filtrar por estado o dagId
 * - Permitir ver detalles de una ejecución
 * - Permitir eliminar una ejecución
 * - Mostrar estadísticas generales
 *
 * **Flujo de usuario**:
 * 1. Usuario accede a /historial
 * 2. Componente carga automáticamente historial (ngOnInit)
 * 3. Backend GET /executions obtiene todos desde MySQL
 * 4. Se muestra tabla de ejecuciones
 * 5. Usuario puede:
 *    - Hacer click en una fila para ver detalles
 *    - Hacer click en "Monitor" para ver estado en tiempo real
 *    - Hacer click en "Eliminar" para remover del historial
 *
 * **Endpoints utilizados**:
 * - GET /executions - Obtiene historial completo
 * - GET /executions/stats/overview - Obtiene estadísticas
 * - DELETE /executions/:id - Elimina una ejecución
 * - GET /executions/:id - Obtiene detalles de una ejecución
 *
 * **Base de datos involucrada**:
 * - MySQL: Tabla executions con histórico de todas las ejecuciones
 *
 * **Material Components**:
 * - mat-table: Para mostrar tabla de ejecuciones
 * - mat-button: Para acciones
 * - Badges: Para mostrar estado
 */
@Component({
  selector: 'app-execution-history',
  template: `
    <div class="history-container animate-up">
      <header class="page-header">
        <h1>Historial de Ejecuciones</h1>
        <p class="subtitle">Registro completo de procesos orquestados en la infraestructura</p>
      </header>

      <!-- Estadísticas Premium -->
      <div *ngIf="stats" class="stats-grid">
        <div class="premium-stat total">
          <div class="stat-content">
            <span class="value">{{ stats.total }}</span>
            <span class="label">Total Ejecuciones</span>
          </div>
          <mat-icon class="stat-icon">inventory_2</mat-icon>
        </div>
        <div class="premium-stat queued">
          <div class="stat-content">
            <span class="value">{{ stats.queued }}</span>
            <span class="label">En Cola</span>
          </div>
          <mat-icon class="stat-icon">hourglass_empty</mat-icon>
        </div>
        <div class="premium-stat running">
          <div class="stat-content">
            <span class="value">{{ stats.running }}</span>
            <span class="label">En Proceso</span>
          </div>
          <div class="pulse-dot"></div>
        </div>
        <div class="premium-stat success">
          <div class="stat-content">
            <span class="value">{{ stats.success }}</span>
            <span class="label">Completadas OK</span>
          </div>
          <mat-icon class="stat-icon success-icon">check_circle</mat-icon>
        </div>
        <div class="premium-stat failed">
          <div class="stat-content">
            <span class="value">{{ stats.failed }}</span>
            <span class="label">Fallidas</span>
          </div>
          <mat-icon class="stat-icon error-icon">report_problem</mat-icon>
        </div>
      </div>

      <!-- Filtros y Acciones -->
      <div class="actions-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Filtrar por DAG ID</mat-label>
          <input matInput #filterInput (keyup)="applyFilter(filterInput.value)" placeholder="Ej: dag_limpieza_datos...">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
        
        <button mat-raised-button color="primary" (click)="loadExecutions()" class="refresh-btn">
          <mat-icon>refresh</mat-icon>
          Sincronizar
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Actualizando registros...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && error" class="state-container error">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
        <button mat-stroked-button color="warn" (click)="loadExecutions()">Reintentar</button>
      </div>

      <!-- Tabla de Ejecuciones -->
      <div *ngIf="!loading && executions.length > 0" class="premium-table-container">
        <table mat-table [dataSource]="filteredExecutions" class="premium-table">
          
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef> ID </th>
            <td mat-cell *matCellDef="let exec"> 
              <span class="id-badge">#{{exec.id}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="dagId">
            <th mat-header-cell *matHeaderCellDef> DAG ID </th>
            <td mat-cell *matCellDef="let exec"> 
              <div class="dag-info">
                <strong>{{exec.dagId}}</strong>
                <span>Run ID: {{exec.dagRunId | slice:0:12}}...</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let exec">
              <span class="status-pill" [ngClass]="'status-' + exec.status">
                {{ exec.status }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef> Creado </th>
            <td mat-cell *matCellDef="let exec" class="date-cell">
               <div class="date-stacked">
                 <strong>{{exec.createdAt | date: 'dd MMM, yyyy'}}</strong>
                 <span>{{exec.createdAt | date: 'HH:mm:ss'}}</span>
               </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="startedAt">
            <th mat-header-cell *matHeaderCellDef> Iniciado </th>
            <td mat-cell *matCellDef="let exec" class="date-cell">
              {{exec.startedAt ? (exec.startedAt | date: 'shortTime') : '-'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="completedAt">
            <th mat-header-cell *matHeaderCellDef> Completado </th>
            <td mat-cell *matCellDef="let exec" class="date-cell">
              {{exec.completedAt ? (exec.completedAt | date: 'shortTime') : '-'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef> Acciones </th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <button mat-icon-button color="primary" matTooltip="Monitor" (click)="viewMonitor(row.id)" [disabled]="row.status === 'success' || row.status === 'failed'">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button color="accent" matTooltip="Detalles" (click)="viewDetails(row.id)">
                <mat-icon>analytics</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="deleteExecution(row.id)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <!-- Sin datos -->
      <div *ngIf="!loading && executions.length === 0" class="empty-state">
        <mat-icon>history</mat-icon>
        <p>No se encontraron registros de ejecución.</p>
        <button mat-raised-button color="primary" [routerLink]="['/informes']">
          Lanzar Primer Proceso
        </button>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 3rem 2rem;
      max-width: 1500px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 3.5rem;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 800;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .premium-stat {
      background: var(--bg-card);
      padding: 1.5rem;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .premium-stat.total { border-left: 4px solid var(--primary); }
    .premium-stat.queued { border-left: 4px solid var(--warning); }
    .premium-stat.running { border-left: 4px solid var(--accent); }
    .premium-stat.success { border-left: 4px solid var(--success); }
    .premium-stat.failed { border-left: 4px solid var(--danger); }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-content .value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--secondary);
    }

    .stat-content .label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-icon {
      color: var(--border-color);
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      opacity: 0.5;
    }

    .pulse-dot {
      width: 12px;
      height: 12px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(79, 93, 227, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(79, 93, 227, 0); }
      100% { box-shadow: 0 0 0 0 rgba(79, 93, 227, 0); }
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1.5rem;
    }

    .search-field {
      flex: 1;
      max-width: 500px;
    }

    .refresh-btn {
      height: 56px !important;
      padding: 0 1.5rem !important;
      border-radius: var(--radius-md) !important;
    }

    /* Table Styling */
    .premium-table-container {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .premium-table {
      width: 100%;
    }

    .mat-header-cell {
      background: var(--bg-main);
      color: var(--secondary);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      padding: 1.25rem !important;
    }

    .mat-cell {
      padding: 1.25rem !important;
      border-bottom: 1px solid var(--bg-main);
    }

    .mat-row:hover {
      background: hsla(230, 85%, 60%, 0.02);
    }

    .id-badge {
      background: var(--bg-main);
      color: var(--primary);
      padding: 4px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-weight: 700;
    }

    .dag-info {
      display: flex;
      flex-direction: column;
    }

    .dag-info strong {
      color: var(--text-main);
      font-size: 0.95rem;
    }

    .dag-info span {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .status-pill {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-success { background: #d1e7dd; color: #0f5132; }
    .status-failed { background: #f8d7da; color: #842029; }
    .status-running { background: #cfe2ff; color: #084298; }
    .status-queued { background: #fff3cd; color: #856404; }

    .date-stacked {
      display: flex;
      flex-direction: column;
    }

    .date-stacked strong { font-size: 0.85rem; }
    .date-stacked span { font-size: 0.75rem; color: var(--text-muted); }

    .actions-cell {
      display: flex;
      gap: 0.5rem;
    }

    /* States */
    .state-container, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6rem 2rem;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      gap: 1.5rem;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: var(--border-color);
    }

    @media (max-width: 900px) {
      .actions-bar { flex-direction: column; align-items: stretch; }
      .search-field { max-width: none; }
    }
  `]
})
export class ExecutionHistoryComponent implements OnInit {
  executions: Execution[] = [];
  filteredExecutions: Execution[] = [];
  stats: any = null;
  loading = true;
  error: string | null = null;
  displayedColumns: string[] = ['id', 'dagId', 'status', 'createdAt', 'startedAt', 'completedAt', 'acciones'];
  filterText = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  /**
   * Ciclo de vida: Inicialización
   */
  ngOnInit(): void {
    this.loadExecutions();
    this.loadStats();
  }

  /**
   * Carga el historial de ejecuciones desde MySQL vía backend.
   *
   * **Endpoint**: GET /executions
   * **Base de datos**: MySQL
   */
  loadExecutions(): void {
    this.loading = true;
    this.error = null;

    this.http.get<Execution[]>('http://localhost:3000/executions')
      .subscribe({
        next: (data) => {
          this.executions = data;
          this.filteredExecutions = [...data];
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error cargando historial de ejecuciones';
          this.loading = false;
          console.error('Error loading executions:', err);
        }
      });
  }

  /**
   * Carga estadísticas de ejecuciones.
   *
   * **Endpoint**: GET /executions/stats/overview
   */
  loadStats(): void {
    this.http.get<any>('http://localhost:3000/executions/stats/overview')
      .subscribe({
        next: (data) => {
          this.stats = data;
        },
        error: (err) => {
          console.error('Error loading stats:', err);
        }
      });
  }

  /**
   * Aplica filtro a las ejecuciones mostradas.
   *
   * @param filterValue - Texto a buscar en dagId
   */
  applyFilter(filterValue: string): void {
    this.filterText = filterValue.toLowerCase();
    this.filteredExecutions = this.executions.filter(exec =>
      exec.dagId.toLowerCase().includes(this.filterText)
    );
  }

  /**
   * Navega al monitor de una ejecución (solo si está en ejecución).
   *
   * @param executionId - ID de la ejecución
   */
  viewMonitor(executionId: number): void {
    this.router.navigate(['/historial', executionId, 'monitor']);
  }

  /**
   * Navega a detalles de una ejecución.
   *
   * @param executionId - ID de la ejecución
   */
  viewDetails(executionId: number): void {
    this.router.navigate(['/historial', executionId, 'detalle']);
  }

  /**
   * Elimina una ejecución con confirmación.
   *
   * @param executionId - ID de la ejecución
   */
  deleteExecution(executionId: number): void {
    if (!confirm('¿Está seguro de que desea eliminar esta ejecución?')) {
      return;
    }

    this.http.delete(`http://localhost:3000/executions/${executionId}`)
      .subscribe({
        next: () => {
          this.loadExecutions();
          this.loadStats();
        },
        error: (err) => {
          alert('Error al eliminar la ejecución');
          console.error('Error deleting execution:', err);
        }
      });
  }
}
