import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { ListTemplatesComponent } from './list-templates/list-templates.component';
import { ExecutionHistoryComponent } from './execution-history/execution-history.component';
import { ExecutionMonitorComponent } from './execution-monitor/execution-monitor.component';
import { ExecutionDetailComponent } from './execution-detail/execution-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';


/**
 * AppModule
 *
 * Módulo raíz de la aplicación Angular.
 *
 * **Responsabilidades**:
 * - Configurar routing para toda la aplicación
 * - Importar módulos Material necesarios
 * - Declarar componentes principales
 * - Configurar interceptores HTTP globales
 *
 * **Rutas disponibles**:
 * - `/dashboard` → Dashboard con resumen y accesos rápidos
 * - `/informes` → ListTemplatesComponent - Catálogo de templates disponibles
 * - `/informes/:templateName` → DynamicFormComponent - Formulario dinámico
 * - `/historial` → ExecutionHistoryComponent - Tabla de todas ejecuciones
 * - `/historial/:executionId/monitor` → ExecutionMonitorComponent - Monitor tiempo real
 * - `/historial/:executionId/detalle` → ExecutionDetailComponent - Detalles completos
 * - Ruta default → `/dashboard`
 *
 * **Material Modules Importados**:
 * - MatFormFieldModule: Para form fields
 * - MatInputModule: Para inputs de texto
 * - MatSelectModule: Para dropdowns
 * - MatCheckboxModule: Para checkboxes
 * - MatDatepickerModule: Para date pickers
 * - MatButtonModule: Para botones
 * - MatCardModule: Para cards (templates, stats)
 * - MatTableModule: Para tablas (ejecuciones)
 * - MatIconModule: Para iconos Material
 * - MatProgressBarModule: Para progress bar (monitor)
 * - MatChipsModule: Para chips/badges (estados)
 *
 * **Flujo de la aplicación**:
 * 1. Usuario entra a `/dashboard` (landing page)
 * 2. Navega a `/informes` para ver templates disponibles
 * 3. Selecciona un template → va a `/informes/{templateName}`
 * 4. Rellena formulario y envía → POST /executions
 * 5. Navega automáticamente a `/historial/{executionId}/monitor`
 * 6. Puede monitorear ejecución en tiempo real (polling cada 2 seg)
 * 7. Después puede ver `/historial` para ver historial completo
 * 8. O ver `/historial/:executionId/detalle` para detalles específicos
 *
 * **Arquitectura de componentes**:
 * - AppComponent: Componente raíz con Router outlet
 * - ListTemplatesComponent: Grid de templates (GET /templates/test)
 * - DynamicFormComponent: Formulario dinámico + historial (GET /templates/{name}, POST /executions)
 * - ExecutionHistoryComponent: Tabla + stats (GET /executions, GET /executions/stats)
 * - ExecutionMonitorComponent: Monitor con polling (GET /executions/{id}, polling GET /status)
 * - ExecutionDetailComponent: Detalles completos (GET /executions/{id})
 */
const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'informes', component: ListTemplatesComponent },
  { path: 'informes/:templateName', component: DynamicFormComponent },
  { path: 'historial', component: ExecutionHistoryComponent },
  { path: 'historial/:executionId/monitor', component: ExecutionMonitorComponent },
  { path: 'historial/:executionId/detalle', component: ExecutionDetailComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  declarations: [
    AppComponent,
    DynamicFormComponent,
    ListTemplatesComponent,
    ExecutionHistoryComponent,
    ExecutionMonitorComponent,
    ExecutionDetailComponent,
    DashboardComponent
  ],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule],
  bootstrap: [AppComponent]
})
export class AppModule { }

