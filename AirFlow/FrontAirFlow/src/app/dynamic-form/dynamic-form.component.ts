import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { MatDatepicker } from '@angular/material/datepicker';


interface Field {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
}

interface Template {
  reportName: string;
  description: string;
  fields: Field[];
}

/**
 * DynamicFormComponent
 *
 * Componente para renderizar formularios dinámicos y crear ejecuciones de DAGs.
 *
 * **Responsabilidades**:
 * - Cargar template desde CouchDB
 * - Construir formulario reactivo dinámicamente
 * - Permitir usuario rellenar parámetros
 * - Enviar parámetros y disparar DAG en Airflow
 * - Mostrar histórico de ejecuciones del formulario
 * - Permitir navegar a monitor de ejecución
 *
 * **Flujo de usuario**:
 * 1. Usuario accede a /informes/{templateName}
 * 2. Componente GET /templates/{templateName} desde CouchDB
 * 3. Muestra formulario dinámico
 * 4. Usuario rellena formulario
 * 5. Click en "Ejecutar" → POST /executions
 * 6. Backend crea execution en MySQL y dispara DAG en Airflow
 * 7. Muestra confirmación y navega a monitor
 * 8. Muestra histórico de ejecuciones de este template
 *
 * **Endpoints utilizados**:
 * - GET /templates/{templateName} - Cargar template de CouchDB
 * - POST /executions - Crear ejecución y disparar DAG (NUEVO)
 * - GET /executions - Obtener historial (NUEVO)
 *
 * **Bases de datos involucradas**:
 * - CouchDB: Almacenamiento de templates
 * - MySQL: Almacenamiento de executions
 * - Airflow: Ejecución de DAGs
 *
 * **BREAKING CHANGE**: Cambio de Submissions a Executions
 * - Antes: POST /submissions guardaba simple data
 * - Ahora: POST /executions dispara DAG en Airflow y sincroniza estado
 */
@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
})
export class DynamicFormComponent implements OnInit, AfterViewInit {
  /**
   * Formulario reactivo construido dinámicamente
   * Propiedades: uno por cada field del template
   */
  form!: FormGroup;

  /**
   * Template cargado desde CouchDB
   * Contiene: reportName, description, fields[]
   */
  template!: Template;

  /**
   * Nombre del template/DAG (ej: "informe_ventas")
   * Se obtiene de la ruta: /informes/:templateName
   */
  templateName = '';

  /**
   * Historial de ejecuciones de este template
   * Se obtiene de GET /executions y se filtra por templateName
   */
  executions: any[] = [];

  /**
   * Estado de carga
   */
  loading = false;
  submitting = false;

  @ViewChildren(MatDatepicker) datepickerRefs!: QueryList<MatDatepicker<any>>;
  pickers: MatDatepicker<any>[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  /**
   * Ciclo de vida: Inicialización
   *
   * Flujo:
   * 1. Obtiene nombre del template desde ruta
   * 2. Carga template desde CouchDB
   * 3. Construye formulario dinámicamente
   * 4. Carga historial de ejecuciones
   */
  ngOnInit(): void {
    this.templateName = this.route.snapshot.paramMap.get('templateName') || '';
    if (!this.templateName) {
      alert('Template name not provided');
      return;
    }
    this.loadTemplate(this.templateName);
  }

  ngAfterViewInit() {
    this.pickers = this.datepickerRefs.toArray();
  }

  /**
   * Carga un template desde CouchDB vía backend.
   *
   * **Endpoint**: GET /templates/:templateName
   * **Base de datos**: CouchDB
   *
   * @param templateName - Nombre del template (ej: "informe_ventas")
   *
   * Flujo:
   * 1. GET /templates/{templateName}
   * 2. Si éxito: construye formulario y carga ejecuciones
   * 3. Si error: muestra alerta
   */
  loadTemplate(templateName: string): void {
    this.loading = true;

    this.http
      .get<Template>(
        `http://localhost:3000/templates/${templateName}`
      )
      .subscribe({
        next: (template) => {
          this.template = template;
          this.buildForm(template.fields);
          this.loadExecutions();
          this.loading = false;
        },
        error: () => {
          alert('No se encontró la plantilla del formulario.');
          this.loading = false;
        }
      });
  }

  /**
   * Construye un FormGroup reactivo basado en los campos del template.
   *
   * @param fields - Array de campos del template
   *
   * Ejemplo:
   * ```
   * Template fields: [
   *   { name: "fecha_inicio", type: "date" },
   *   { name: "region", type: "select" }
   * ]
   *
   * Resultado FormGroup: {
   *   fecha_inicio: FormControl(''),
   *   region: FormControl('')
   * }
   * ```
   */
  buildForm(fields: Field[]): void {
    const group: any = {};
    fields.forEach(field => {
      group[field.name] = [''];
    });
    this.form = this.fb.group(group);
  }

  /**
   * Envía el formulario y dispara un DAG en Airflow.
   *
   * **Endpoint**: POST /executions
   * **Base de datos**: MySQL + Airflow
   *
   * **Flujo**:
   * 1. Valida formulario
   * 2. POST /executions con { dagId, parameters }
   * 3. Backend crea registro en MySQL (status: queued)
   * 4. Backend dispara DAG en Airflow
   * 5. Si éxito: navega a monitor de ejecución
   * 6. Si error: muestra mensaje
   *
   * **Payload**:
   * ```json
   * {
   *   "dagId": "informe_ventas",
   *   "parameters": {
   *     "fecha_inicio": "2026-01-01",
   *     ...valores del formulario...
   *   }
   * }
   * ```
   *
   * **CAMBIO**: Antes POST /submissions solo guardaba. Ahora POST /executions dispara DAG.
   */
  onSubmit(): void {
    if (!this.form.valid) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.submitting = true;

    const payload = {
      dagId: this.templateName,
      parameters: this.form.value
    };

    this.http.post<any>('http://localhost:3000/executions', payload)
      .subscribe({
        next: (execution) => {
          this.submitting = false;

          alert(`Ejecución #${execution.id} creada y despachada a Airflow`);

          // Navega al monitor para ver progreso en tiempo real
          this.router.navigate([
            '/historial',
            execution.id,
            'monitor'
          ]);
        },
        error: (err) => {
          this.submitting = false;
          console.error('Error:', err);
          alert('Error al crear la ejecución: ' + (err?.error?.message || err?.message || 'Unknown error'));
        }
      });
  }

  /**
   * Carga el historial de ejecuciones.
   *
   * **Endpoint**: GET /executions
   * **Base de datos**: MySQL
   *
   * Obtiene todas las ejecuciones y las filtra por templateName.
   */
  loadExecutions(): void {
    this.http.get<any[]>('http://localhost:3000/executions')
      .subscribe({
        next: (allExecutions) => {
          // Filtrar por templateName/dagId
          this.executions = allExecutions
            .filter(exec => exec.dagId === this.templateName)
            .sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        },
        error: (err) => {
          console.error('Error loading executions:', err);
          this.executions = [];
        }
      });
  }

  /**
   * Navega al monitor de una ejecución.
   *
   * @param executionId - ID de la ejecución
   */
  viewMonitor(executionId: number): void {
    this.router.navigate(['/historial', executionId, 'monitor']);
  }

  /**
   * Consulta el estado actual de una ejecución.
   * (Actualmente solo lee de la lista, pero puede hacer GET adicional)
   *
   * @param executionId - ID de la ejecución
   */
  viewDetails(executionId: number): void {
    this.router.navigate(['/historial', executionId, 'detalle']);
  }

  /**
   * Elimina una ejecución del historial.
   *
   * **Endpoint**: DELETE /executions/:id
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
        },
        error: (err) => {
          alert('Error al eliminar: ' + err?.error?.message || 'Unknown error');
        }
      });
  }
}
