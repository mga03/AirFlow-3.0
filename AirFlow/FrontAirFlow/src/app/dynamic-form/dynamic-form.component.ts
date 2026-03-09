import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
 */
@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.css']
})
export class DynamicFormComponent implements OnInit {
  form!: FormGroup;
  template!: Template;
  templateName = '';
  loading = false;
  submitting = false;

  // Rango de fechas permitido para evitar años inválidos (como 9999)
  minDate = new Date(1900, 0, 1);
  maxDate = new Date(2100, 11, 31);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.templateName = this.route.snapshot.paramMap.get('templateName') || '';
    if (!this.templateName) {
      alert('Template name not provided');
      return;
    }
    this.loadTemplate(this.templateName);
  }

  /**
   * Carga un template desde CouchDB vía backend.
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
   * Agrega validación de campo requerido por defecto.
   */
  buildForm(fields: Field[]): void {
    const group: any = {};
    fields.forEach(field => {
      // Por defecto, todos los campos son requeridos para asegurar consistencia en Airflow
      group[field.name] = ['', [Validators.required]];
    });
    this.form = this.fb.group(group);
  }

  /**
   * Envía el formulario y dispara un DAG en Airflow.
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    // Validación adicional de seguridad para fechas (evitar años extremos como 9999)
    if (!this.validateDates()) {
      alert('Se han detectado fechas fuera del rango permitido (máximo año 2100).');
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
          // Navega al monitor para ver progreso en tiempo real
          this.router.navigate(['/historial', execution.id, 'monitor']);
        },
        error: (err) => {
          this.submitting = false;
          console.error('Error:', err);
          alert('Error al crear la ejecución: ' + (err?.error?.message || err?.message || 'Unknown error'));
        }
      });
  }

  /**
   * Valida que las fechas del formulario sean razonables.
   */
  private validateDates(): boolean {
    const values = this.form.value;
    for (const field of this.template.fields) {
      if (field.type === 'date' && values[field.name]) {
        const date = new Date(values[field.name]);
        if (date.getFullYear() > 2100 || date.getFullYear() < 1900) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Marca todos los campos como tocados para mostrar errores de validación.
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}
