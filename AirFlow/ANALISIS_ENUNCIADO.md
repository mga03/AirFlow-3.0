#  ANÁLISIS: Brecha entre Actual vs Enunciado

## Comparativa

| Funcionalidad | Actual  | Enunciado  |
|---------------|----------|------------|
| **Listado de informes** | Manual (ruta hardcodeada) | Catálogo dinámico completo |
| **Historial de ejecuciones** | Submissions (simple) | Executions (detallado con estado) |
| **Estado de ejecuciones** | No existe | Sincronizado con Airflow en tiempo real |
| **Histórico persistente** |  MySQL |  MySQL mejorado |
| **Monitorización** | No existe | Monitor visual del estado |
| **Trigger DAG** |  Existe |  Mejora: registra execution |
| **Sincronización Airflow** | Parcial | Completa: pull de estados |

---

## Implementación Requerida

### BACKEND - NestJS

#### 1. Nueva Entidad: Execution
```
Antes: Submission { id, dagId, data, createdAt, updatedAt }
Ahora: Execution { 
  id, 
  dagId, 
  dagRunId (de Airflow),
  parameters, 
  status (queued, running, success, failed),
  startedAt, 
  completedAt, 
  result (JSON),
  logs (texto),
  createdAt, 
  updatedAt 
}
```

#### 2. Nuevo Módulo: ExecutionsModule
- ExecutionsController: GET /executions, GET /executions/:id, GET /executions/:id/status, POST /executions
- ExecutionsService: CRUD + syncStatus()

#### 3. Mejorar DagsService
- Agregar método: getDagRunStatus(dagRunId) - consulta Airflow
- Agregar método: getDagRunLogs(dagRunId) - obtiene logs

#### 4. Flujo Mejorado POST /executions
1. Guardar execution en MySQL (status: 'queued')
2. Disparar DAG en Airflow
3. Guardar dagRunId en execution
4. Devolver execution al frontend

---

### FRONTEND - Angular

#### 1. Nuevos Componentes
- **ListTemplatesComponent**: Catálogo de informes (lista de templates de CouchDB)
- **ExecutionHistoryComponent**: Historial total de executions
- **ExecutionMonitorComponent**: Monitor de estado en tiempo real (polling a /executions/:id/status)
- **ExecutionDetailComponent**: Detalle de una ejecución (parámetros, logs, resultado)

#### 2. Routes
```typescript
const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'informes', component: ListTemplatesComponent },
  { path: 'informes/:templateName', component: DynamicFormComponent },
  { path: 'historial', component: ExecutionHistoryComponent },
  { path: 'historial/:executionId/monitor', component: ExecutionMonitorComponent },
  { path: 'historial/:executionId/detalle', component: ExecutionDetailComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
```

#### 3. Navegación
Mejora de UX: Sidebar/Navbar con opciones de navegación

---

## Cambios en Flujo

### ACTUAL (Simple)
1. Abre URL → formulario → envía → guardado en MySQL

### ENUNCIADO (Completo)
1. Abre Dashboard
2. Navega a Catálogo de Informes
3. Selecciona un informe
4. Ve formulario dinámico
5. Rellena y envía
6. Backend crea Execution (status: queued) y dispara DAG
7. Usuario navega a Historial
8. Ve lista de executions
9. Selecciona una y abre Monitor
10. Monitor hace polling a /executions/:id/status
11. Estado se sincroniza con Airflow
12. Ve logs y resultado final

---

## Prioridades Implementacion

1.  Crear Execution entity (reemplaza Submission)
2.  Crear ExecutionsController y Service
3.  Mejorar DagsService (agregar getDagRunStatus, getDagRunLogs)
4.  Actualizar TemplatesController (ya funciona)
5.  Crear componentes Angular
6.  Actualizar routing
7.  Comentar JSDoc toda la arquitectura

