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
    <div class="templates-container">
      <h1>Catálogo de Informes Disponibles</h1>
      <p class="subtitle">Selecciona un informe para ejecutar</p>

      <div *ngIf="loading" class="loading">
        <p>Cargando informes...</p>
      </div>

      <div *ngIf="!loading && error" class="error-message">
        <p>Error al cargar los informes: {{ error }}</p>
      </div>

      <div *ngIf="!loading && !error && templates.length === 0" class="no-data">
        <p>No hay informes disponibles en este momento.</p>
      </div>

      <div class="templates-grid" *ngIf="!loading && templates.length > 0">
        <mat-card *ngFor="let template of templates" class="template-card">
          <mat-card-header>
            <h2 class="template-title">{{ template.reportName }}</h2>
          </mat-card-header>

          <mat-card-content>
            <p class="template-description">{{ template.description }}</p>
            <div class="template-info">
              <span class="info-label">Campos:</span>
              <span class="info-value">{{ template.fields?.length || 0 }}</span>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button
              mat-raised-button
              color="primary"
              (click)="selectTemplate(template.name)"
              class="action-button"
            >
              Ver Formulario
            </button>
            <button
              mat-button
              color="accent"
              (click)="showDetails(template)"
              class="secondary-button"
            >
              Detalles
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .templates-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      text-align: center;
      color: #999;
      margin-bottom: 2rem;
      font-size: 14px;
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

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .template-card {
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border-left: 4px solid #1976d2;
    }

    .template-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .template-title {
      margin: 0;
      font-size: 18px;
      color: #1976d2;
    }

    .template-description {
      color: #666;
      margin: 0.5rem 0 0 0;
    }

    .template-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      font-size: 12px;
    }

    .info-label {
      font-weight: bold;
      color: #999;
    }

    .info-value {
      color: #1976d2;
      font-weight: bold;
    }

    mat-card-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background-color: #fafafa;
    }

    .action-button {
      flex: 1;
    }

    .secondary-button {
      flex: 0.5;
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
