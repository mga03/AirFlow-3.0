import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/**
 * Template Interface
 * Define la estructura de un template/informe disponible.
 */
interface Template {
  _id?: string;
  name: string;
  reportName: string;
  description: string;
  fields: any[];
}

/**
 * ListTemplatesComponent
 *
 * Componente que muestra el catálogo completo de informes disponibles.
 *
 * **Responsabilidades**:
 * - Cargar lista de templates desde CouchDB vía backend
 * - Mostrar catálogo en interfaz amigable
 * - Permitir usuario seleccionar un informe
 * - Navegar a DynamicFormComponent con template seleccionado
 *
 * **Flujo de usuario**:
 * 1. Usuario accede a /informes
 * 2. Componente carga automáticamente lista de templates (ngOnInit)
 * 3. Backend GET /templates/test obtiene todos desde CouchDB
 * 4. Se muestra lista de informes disponibles
 * 5. Usuario hace click en un informe
 * 6. Navega a /informes/{templateName} con DynamicFormComponent
 *
 * **Endpoints utilizados**:
 * - GET /templates/test - Obtiene todos los templates de CouchDB
 *
 * **Base de datos involucrada**:
 * - CouchDB: Almaceno de templates (configuración)
 *
 * **Material Components**:
 * - mat-card: Para mostrar cada informe como tarjeta
 * - mat-button: Para botón "Ver Formulario"
 * - Animaciones: slide-in effect al cargar
 */
@Component({
  selector: 'app-list-templates',
  template: `
    <div class="templates-container animate-up">
      <header class="page-header">
        <h1>Catálogo de Informes</h1>
        <p class="subtitle">Selecciona una plantilla preconfigurada para iniciar tu flujo de trabajo</p>
      </header>

      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Sincronizando con el servidor...</p>
      </div>

      <div *ngIf="!loading && error" class="error-container">
        <mat-icon>error_outline</mat-icon>
        <p>Error al sincronizar informes: {{ error }}</p>
        <button mat-stroked-button color="warn" (click)="loadTemplates()">Reintentar</button>
      </div>

      <div *ngIf="!loading && !error && templates.length === 0" class="empty-container">
        <mat-icon>inventory_2</mat-icon>
        <p>No se encontraron plantillas disponibles para tu perfil.</p>
      </div>

      <div class="templates-grid" *ngIf="!loading && templates.length > 0">
        <mat-card *ngFor="let template of templates" class="template-card" (click)="selectTemplate(template.name)">
          <div class="card-glow"></div>
          <mat-card-header>
            <div mat-card-avatar class="template-icon">
              <mat-icon>description</mat-icon>
            </div>
            <mat-card-title>{{ template.reportName }}</mat-card-title>
            <mat-card-subtitle>Template: {{ template.name }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <p class="template-description">{{ template.description }}</p>
          </mat-card-content>

          <mat-card-footer>
            <div class="template-meta">
              <div class="meta-item">
                <mat-icon>tune</mat-icon>
                <span>{{ template.fields?.length || 0 }} Parámetros</span>
              </div>
              <div class="meta-tag">Configurado</div>
            </div>
            <div class="card-actions">
              <button mat-button class="btn-details" (click)="$event.stopPropagation(); showDetails(template)">
                DETALLES
              </button>
              <button mat-raised-button color="primary" class="btn-execute">
                EJECUTAR
                <mat-icon>play_arrow</mat-icon>
              </button>
            </div>
          </mat-card-footer>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .templates-container {
      padding: 3rem 2rem;
      max-width: 1300px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 4rem;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .loading-state, .error-container, .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem 2rem;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      gap: 1.5rem;
    }

    .error-container mat-icon, .empty-container mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: var(--text-muted);
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2.5rem;
    }

    .template-card {
      position: relative;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
      cursor: pointer;
      background: var(--bg-card);
      padding: 0;
    }

    .template-card:hover {
      transform: translateY(-12px);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary);
    }

    .card-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, hsla(230, 85%, 60%, 0.05) 0%, transparent 70%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .template-card:hover .card-glow {
      opacity: 1;
    }

    .template-card mat-card-header {
      padding: 1.5rem;
      background: rgba(245, 247, 251, 0.5);
      border-bottom: 1px solid var(--border-color);
    }

    .template-icon {
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(79, 93, 227, 0.3);
    }

    mat-card-title {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: var(--secondary);
    }

    mat-card-subtitle {
      color: var(--text-muted) !important;
      font-size: 0.85rem !important;
      margin-top: 4px;
    }

    mat-card-content {
      padding: 1.5rem !important;
      min-height: 100px;
    }

    .template-description {
      color: var(--text-main);
      line-height: 1.6;
      font-size: 0.95rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    mat-card-footer {
      padding: 1rem 1.5rem 1.5rem !important;
      border-top: 1px dashed var(--border-color);
    }

    .template-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .meta-item mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    .meta-tag {
      padding: 4px 10px;
      background: var(--bg-main);
      color: var(--primary);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .card-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-details {
      flex: 1;
      font-weight: 600 !important;
      letter-spacing: 0.5px;
      border-radius: var(--radius-md) !important;
      border: 1px solid var(--border-color) !important;
    }

    .btn-execute {
      flex: 1.5;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    @media (max-width: 600px) {
      .templates-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ListTemplatesComponent implements OnInit {
  templates: Template[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  /**
   * Ciclo de vida: Inicialización
   * Se ejecuta cuando el componente carga.
   * Obtiene lista de templates desde backend.
   */
  ngOnInit(): void {
    this.loadTemplates();
  }

  /**
   * Carga la lista de todos los templates desde CouchDB vía backend.
   *
   * **Endpoint**: GET /templates/test
   * **Base de datos**: CouchDB
   *
   * Flujo:
   * 1. loading = true (mostrar spinner)
   * 2. GET /templates/test
   * 3. Si éxito: templates = respuesta, loading = false
   * 4. Si error: error = mensaje, loading = false
   */
  loadTemplates(): void {
    this.loading = true;
    this.error = null;

    this.http.get<Template[]>('http://localhost:3000/templates/test')
      .subscribe({
        next: (data) => {
          this.templates = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error cargando informes';
          this.loading = false;
          console.error('Error loading templates:', err);
        }
      });
  }

  /**
   * Selecciona un template y navega al formulario dinámico.
   *
   * @param templateName - Nombre del template seleccionado
   *
   * Flujo:
   * 1. this.router.navigate() va a /informes/{templateName}
   * 2. DynamicFormComponent se renderiza
   * 3. DynamicFormComponent.ngOnInit() obtiene parámetro templateName
   * 4. Carga template específico desde CouchDB
   * 5. Construye y muestra formulario
   */
  selectTemplate(templateName: string): void {
    this.router.navigate(['/informes', templateName]);
  }

  /**
   * Muestra detalles de un template (puede abrir modal en futuro).
   *
   * @param template - Template a mostrar
   */
  showDetails(template: Template): void {
    console.log('Template details:', template);
    // TODO: Implementar modal con detalles
  }
}
