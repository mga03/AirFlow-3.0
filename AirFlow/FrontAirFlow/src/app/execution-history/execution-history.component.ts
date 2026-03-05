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
    <div class="history-container">
      <h1>Historial de Ejecuciones</h1>

      <!-- Estadísticas -->
      <div *ngIf="stats" class="stats-section">
        <div class="stat-card total">
          <span class="stat-number">{{ stats.total }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card queued">
          <span class="stat-number">{{ stats.queued }}</span>
          <span class="stat-label">En Cola</span>
        </div>
        <div class="stat-card running">
          <span class="stat-number">{{ stats.running }}</span>
          <span class="stat-label">Ejecutando</span>
        </div>
        <div class="stat-card success">
          <span class="stat-number">{{ stats.success }}</span>
          <span class="stat-label">Exitosas</span>
        </div>
        <div class="stat-card failed">
          <span class="stat-number">{{ stats.failed }}</span>
          <span class="stat-label">Fallidas</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-section">
        <input
          #filterInput
          type="text"
          placeholder="Buscar por DAG ID..."
          (keyup)="applyFilter(filterInput.value)"
          class="filter-input"
        />
        <button mat-button (click)="loadExecutions()" class="refresh-button">
          🔄 Actualizar
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <p>Cargando historial...</p>
      </div>

      <!-- Error -->
      <div *ngIf="!loading && error" class="error-message">
        <p>⚠️ {{ error }}</p>
      </div>

      <!-- Tabla de Ejecuciones -->
      <div *ngIf="!loading && executions.length > 0" class="table-wrapper">
        <table class="executions-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>DAG ID</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Iniciado</th>
              <th>Completado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let exec of filteredExecutions">
              <td>{{ exec.id }}</td>
              <td class="dag-id">{{ exec.dagId }}</td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + exec.status">
                  {{ exec.status }}
                </span>
              </td>
              <td class="date">{{ exec.createdAt | date: 'short' }}</td>
              <td class="date">{{ exec.startedAt | date: 'short' }}</td>
              <td class="date">{{ exec.completedAt | date: 'short' }}</td>
              <td class="actions">
                <button
                  mat-icon-button
                  (click)="viewMonitor(exec.id)"
                  title="Ver Monitor"
                  [disabled]="exec.status === 'success' || exec.status === 'failed'"
                  class="action-btn"
                >
                  📊
                </button>
                <button
                  mat-icon-button
                  (click)="viewDetails(exec.id)"
                  title="Ver Detalles"
                  class="action-btn"
                >
                  👁️
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  (click)="deleteExecution(exec.id)"
                  title="Eliminar"
                  class="action-btn"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sin datos -->
      <div *ngIf="!loading && executions.length === 0" class="no-data">
        <p>No hay ejecuciones registradas aún.</p>
        <button mat-raised-button color="primary" [routerLink]="['/informes']">
          → Crear una nueva ejecución
        </button>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 2rem;
      color: #333;
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      color: white;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-card.total { background: #1976d2; }
    .stat-card.queued { background: #ff9800; }
    .stat-card.running { background: #2196f3; }
    .stat-card.success { background: #4caf50; }
    .stat-card.failed { background: #f44336; }

    .stat-number {
      font-size: 28px;
      font-weight: bold;
    }

    .stat-label {
      font-size: 12px;
    }

    .filters-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .filter-input {
      flex: 1;
      min-width: 250px;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .refresh-button {
      padding: 0.75rem 1.5rem;
    }

    .loading, .error-message, .no-data {
      text-align: center;
      padding: 3rem 1rem;
      font-size: 16px;
    }

    .error-message {
      color: #d32f2f;
      background-color: #ffebee;
      border-radius: 4px;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .executions-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    .executions-table thead {
      background-color: #f5f5f5;
      font-weight: bold;
    }

    .executions-table th, .executions-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .executions-table tbody tr:hover {
      background-color: #f9f9f9;
    }

    .dag-id {
      font-weight: 500;
      color: #1976d2;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }

    .status-queued { background: #ff9800; }
    .status-running { background: #2196f3; }
    .status-success { background: #4caf50; }
    .status-failed { background: #f44336; }

    .date {
      font-size: 12px;
      color: #666;
    }

    .actions {
      display: flex;
      gap: 0.25rem;
    }

    .action-btn {
      font-size: 16px;
    }

    .no-data button {
      margin-top: 1rem;
    }

    @media (max-width: 768px) {
      .stats-section {
        grid-template-columns: repeat(2, 1fr);
      }

      .executions-table th, .executions-table td {
        padding: 0.5rem;
        font-size: 12px;
      }
    }
  `]
})
export class ExecutionHistoryComponent implements OnInit {
  executions: Execution[] = [];
  filteredExecutions: Execution[] = [];
  stats: any = null;
  loading = true;
  error: string | null = null;
  filterText = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

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
