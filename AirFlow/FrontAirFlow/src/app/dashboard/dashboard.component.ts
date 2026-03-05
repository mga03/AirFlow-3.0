import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/**
 * Estadísticas de las ejecuciones
 */
interface Stats {
  total: number;
  queued: number;
  running: number;
  success: number;
  failed: number;
}

/**
 * DashboardComponent
 *
 * Componente de página de inicio/landing page.
 *
 * **Responsabilidades**:
 * - Mostrar resumen de estadísticas
 * - Proporcionar navegación rápida a secciones principales
 * - Mostrar ejecuciones recientes
 * - Mostrar templates disponibles
 *
 * **Flujo de usuario**:
 * 1. Usuario entra a `/dashboard` (ruta por defecto)
 * 2. Ve tarjetas de acceso rápido:
 *    - "Crear Informe" → /informes
 *    - "Ver Historial" → /historial
 * 3. Ve estadísticas resumen
 * 4. Ve ejecuciones recientes
 * 5. Puede navegar a any sección
 *
 * **Endpoints utilizados**:
 * - GET /executions/stats/overview - Obtener estadísticas
 * - GET /executions - Obtener ejecuciones recientes
 * - GET /templates/test - Obtener templates disponibles
 *
 * **Bases de datos involucradas**:
 * - MySQL: Lectura de estadísticas y ejecuciones
 * - CouchDB: Lectura de templates
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  /**
   * Estadísticas de ejecuciones
   */
  stats: Stats = {
    total: 0,
    queued: 0,
    running: 0,
    success: 0,
    failed: 0
  };

  /**
   * Ejecuciones recientes (últimas 5)
   */
  recentExecutions: any[] = [];

  /**
   * Templates disponibles
   */
  templates: any[] = [];

  /**
   * Estado de carga
   */
  loading = true;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  /**
   * Ciclo de vida: Inicialización
   *
   * Flujo:
   * 1. Carga estadísticas
   * 2. Carga ejecuciones recientes
   * 3. Carga templates disponibles
   */
  ngOnInit(): void {
    this.loadStats();
    this.loadRecentExecutions();
    this.loadTemplates();
  }

  /**
   * Carga estadísticas de ejecuciones
   *
   * **Endpoint**: GET /executions/stats/overview
   */
  loadStats(): void {
    this.http.get<Stats>('http://localhost:3000/executions/stats/overview')
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (err) => {
          console.error('Error loading stats:', err);
        }
      });
  }

  /**
   * Carga ejecuciones recientes
   *
   * **Endpoint**: GET /executions
   */
  loadRecentExecutions(): void {
    this.http.get<any[]>('http://localhost:3000/executions')
      .subscribe({
        next: (executions) => {
          this.recentExecutions = executions.slice(0, 5);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading executions:', err);
          this.loading = false;
        }
      });
  }

  /**
   * Carga templates disponibles
   *
   * **Endpoint**: GET /templates/test
   */
  loadTemplates(): void {
    this.http.get<any[]>('http://localhost:3000/templates/test')
      .subscribe({
        next: (templates) => {
          this.templates = templates;
        },
        error: (err) => {
          console.error('Error loading templates:', err);
          this.templates = [];
        }
      });
  }

  /**
   * Navega a página de crear informe
   */
  navigateToCreateReport(): void {
    this.router.navigate(['/informes']);
  }

  /**
   * Navega a página de historial
   */
  navigateToHistory(): void {
    this.router.navigate(['/historial']);
  }

  /**
   * Navega a formulario específico
   *
   * @param templateName - Nombre del template
   */
  navigateToTemplate(templateName: string): void {
    this.router.navigate(['/informes', templateName]);
  }

  /**
   * Navega a monitor de ejecución
   *
   * @param executionId - ID de la ejecución
   */
  navigateToMonitor(executionId: number): void {
    this.router.navigate(['/historial', executionId, 'monitor']);
  }

  /**
   * Obtiene porcentaje de éxito
   *
   * @returns Percentage 0-100
   */
  getSuccessPercentage(): number {
    if (this.stats.total === 0) return 0;
    return Math.round((this.stats.success / this.stats.total) * 100);
  }
}
