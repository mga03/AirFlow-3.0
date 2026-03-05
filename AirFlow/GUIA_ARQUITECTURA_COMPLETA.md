# 📚 GUÍA COMPLETA: ARQUITECTURA DEL PROYECTO

## 📍 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Backend - Estructura NestJS](#backend---estructura-nestjs)
3. [Frontend - Estructura Angular](#frontend---estructura-angular)
4. [Flujo de Datos Completo](#flujo-de-datos-completo)
5. [Cómo Funciona NestJS](#cómo-funciona-nestjs)
6. [Cómo Funciona Angular](#cómo-funciona-angular)

---

## 🎯 Visión General

Este proyecto es una **aplicación web de formularios dinámicos** que permite:

1. **Cargar templates** almacenados en **CouchDB**
2. **Renderizar formularios** dinámicamente en el navegador (Angular)
3. **Guardar envíos** en **MySQL** cuando el usuario completa un formulario
4. **Listar y eliminar** envíos previos

```
┌─────────────────────────────────────────────────────────────┐
│                    EL FLUJO COMPLETO                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Usuario abre navegador → http://localhost:4200           │
│     ↓                                                         │
│  2. Angular (Frontend) carga y navega a:                    │
│     http://localhost:4200/formularios/informe_ventas         │
│     ↓                                                         │
│  3. DynamicFormComponent se renderiza                        │
│     ↓                                                         │
│  4. Solicita template a NestJS:                             │
│     GET http://localhost:3000/templates/informe_ventas       │
│     ↓                                                         │
│  5. NestJS consulta CouchDB:                                │
│     http://admin:password@localhost:5984/templates           │
│     ↓                                                         │
│  6. CouchDB devuelve documento con estructura de campos      │
│     ↓                                                         │
│  7. Angular construye formulario dinámicamente               │
│     ↓                                                         │
│  8. Usuario rellena el formulario                            │
│     ↓                                                         │
│  9. Angular envía datos a NestJS:                           │
│     POST http://localhost:3000/submissions                   │
│     { dagId: "informe_ventas", data: {...datos...} }       │
│     ↓                                                         │
│  10. NestJS guarda en MySQL:                                │
│      INSERT INTO submissions (dagId, data) VALUES (...)      │
│      ↓                                                        │
│  11. Angular obtiene lista actualizada:                     │
│      GET http://localhost:3000/submissions                   │
│      ↓                                                        │
│  12. Se muestra lista de envíos al usuario                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

# 🔧 BACKEND - Estructura NestJS

## 📁 Estructura de Carpetas

```
BackAirFlow/src/
├── main.ts                    ← Punto de entrada (inicializa el servidor)
├── app.module.ts              ← Módulo raíz (core configuration)
├── app.controller.ts          ← Controlador raíz (GET /)
├── app.service.ts             ← Servicio de ejemplo
├── 
├── dags/                       ← MÓDULO: Integración Airflow
│   ├── dags.module.ts         ← Registra DagsController y DagsService
│   ├── dags.controller.ts      ← Endpoints: GET /dags, POST /dags/:dagId/trigger
│   ├── dags.service.ts         ← Lógica: conecta a API Airflow
│   └── dto/
│       └── trigger-dag.dto.ts  ← Validación de datos
│
├── templates/                  ← MÓDULO: Gestión de Templates (CouchDB)
│   ├── templates.module.ts     ← Registra TemplatesController y TemplatesService
│   ├── templates.controller.ts ← Endpoints: GET /templates/test, GET /templates/:name
│   └── templates.service.ts    ← Lógica: conecta a CouchDB con nano
│
└── submissions/                ← MÓDULO: Gestión de Envíos (MySQL)
    ├── submissions.module.ts   ← Registra SubmissionsController, Service y Entity
    ├── submissions.controller.ts ← Endpoints: CRUD /submissions
    ├── submissions.service.ts   ← Lógica: operaciones CRUD en MySQL
    └── entities/
        └── submission.entity.ts ← TypeORM Entity (mapeo a tabla MySQL)
```

## 🏗️ Conceptos Clave de NestJS

### 1️⃣ **Module** - Contenedor de funcionalidad

Un módulo agrupa controllers, services y otras dependencias.

```typescript
// templates.module.ts
@Module({
  controllers: [TemplatesController],      // ← Qué controladores ofrece
  providers: [TemplatesService],            // ← Qué servicios proporciona
})
export class TemplatesModule {}
```

**¿Para qué?** Organizar el código en bloques independientes y reutilizables.

### 2️⃣ **Controller** - Rutas y Endpoints

Define las rutas HTTP que el cliente puede acceder.

```typescript
// templates.controller.ts
@Controller('templates')  // ← Prefijo de ruta: /templates
export class TemplatesController {
  
  @Get('test')  // ← GET /templates/test
  async test() { ... }
  
  @Get(':templateName')  // ← GET /templates/informe_ventas
  async getTemplate(@Param('templateName') name: string) { ... }
}
```

**¿Para qué?** Exponer endpoints HTTP que el frontend puede llamar.

### 3️⃣ **Service** - Lógica de Negocio

Contiene la lógica de la aplicación (acceso a BD, cálculos, etc).

```typescript
// templates.service.ts
@Injectable()
export class TemplatesService {
  
  async getTemplateByName(templateName: string) {
    // Lógica: consultar CouchDB
    return this.db.find({ selector: { name: templateName } });
  }
}
```

**¿Para qué?** Separar la lógica del routing, permitir reutilización.

### 4️⃣ **Entity** - Model de Datos (TypeORM)

Define la estructura de una tabla.

```typescript
// submission.entity.ts
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  dagId: string;
  
  @Column('json')
  data: Record<string, any>;
}
```

**¿Para qué?** Mapear objetos JavaScript a filas en MySQL.

---

## 📋 Detalles de Cada Módulo

### **Módulo 1: Templates (CouchDB)**

```
Carpeta: src/templates/

Responsabilidad: Obtener templates dinámicos de CouchDB

Endpoints:
  GET /templates/test
    → Devuelve TODOS los templates de CouchDB
    → Útil para validar que CouchDB está conectado
    → Respuesta: Array de documentos
    
  GET /templates/:templateName
    → Obtiene un template específico por nombre
    → Ejemplo: GET /templates/informe_ventas
    → Respuesta: { name, description, fields[] }

Dentro:
  - templates.controller.ts
      └─ Define rutas GET /templates
      
  - templates.service.ts
      └─ Conecta a CouchDB con cliente nano
      └─ Métodos: getAllTemplates(), getTemplateByName(), createTemplate()
      
  - templates.module.ts
      └─ Registra el controller y service

Base de datos:
  CouchDB en http://admin:password@localhost:5984
  Base de datos: templates
  Documentos: { name, description, fields[] }
```

**¿Cuándo se usa?**
- Cuando el frontend navega a `/formularios/informe_ventas`
- El componente hace `GET /templates/informe_ventas`
- Backend devuelve la estructura para renderizar el formulario

---

### **Módulo 2: Submissions (MySQL)**

```
Carpeta: src/submissions/

Responsabilidad: Almacenar envíos de formularios completados

Endpoints:
  POST /submissions
    → Crea un nuevo envío en MySQL
    → Body: { dagId: string, data: object }
    → Devuelve: { id, dagId, data, createdAt, updatedAt }
    
  GET /submissions
    → Obtiene TODOS los envíos ordenados por fecha DESC
    → Devuelve: Array de objetos submission
    
  GET /submissions/:id
    → Obtiene UN envío específico
    
  PUT /submissions/:id
    → Actualiza un envío existente
    
  DELETE /submissions/:id
    → Elimina un envío

Dentro:
  - submissions.controller.ts
      └─ Define rutas REST
      
  - submissions.service.ts
      └─ Métodos CRUD: create(), findAll(), findOne(), update(), remove()
      
  - entities/submission.entity.ts
      └─ Estructura de la tabla MySQL
      └─ PrimaryGeneratedColumn: id (auto-increment)
      └─ Column: dagId, data (JSON), createdAt, updatedAt
      
  - submissions.module.ts
      └─ Registra el controller, service y entity

Base de datos:
  MySQL en localhost:3306
  Base de datos: airflow
  Tabla: submissions
  Estructura:
    id (INT PRIMARY KEY AUTO_INCREMENT)
    dagId (VARCHAR 255)
    data (JSON)
    createdAt (TIMESTAMP)
    updatedAt (TIMESTAMP)
```

**¿Cuándo se usa?**
- POST: Cuando el usuario envía un formulario completado
- GET: Cuando se carga la lista de envíos previos
- DELETE: Cuando el usuario elimina un envío

---

### **Módulo 3: Dags (Airflow API)**

```
Carpeta: src/dags/

Responsabilidad: Comunicación con API de Airflow

Endpoints:
  GET /dags
    → Lista todos los DAGs activos en Airflow
    
  POST /dags/:dagId/trigger
    → Dispara un DagRun en Airflow

Dentro:
  - dags.controller.ts
      └─ Define rutas GET /dags, POST /dags/:dagId/trigger
      
  - dags.service.ts
      └─ Conecta a Airflow API: http://10.236.197.9:8080/api/v1
      └─ Métodos: listDags(), triggerDag()
      
  - dags.module.ts
      └─ Registra el controller y service

Nota: Este módulo NO se utiliza actualmente en el frontend.
      Es funcionalidad futura para integración con Airflow.
```

---

## 🔌 Flujo de Información en NestJS

```
Usuario hace REQUEST HTTP
         ↓
   ROUTER (decide qué endpoint)
         ↓
   CONTROLLER (recibe la solicitud)
         ↓
   SERVICE (lógica de negocio)
         ↓
   DATABASE (MySQL o CouchDB)
         ↓
   SERVICE (procesa respuesta)
         ↓
   CONTROLLER (devuelve respuesta HTTP)
         ↓
  Usuario recibe RESPONSE
```

**Ejemplo: POST /submissions**

```
1. Frontend envía:
   POST /submissions
   Body: { dagId: "informe_ventas", data: {...} }

2. SubmissionsController recibe la solicitud
   @Post()
   create(@Body() createSubmissionDto) { ... }

3. Controller llama al Service
   return this.submissionsService.create(dagId, data);

4. Service accede a la BD
   const submission = this.submissionRepository.create({ dagId, data });
   return this.submissionRepository.save(submission);

5. TypeORM ejecuta:
   INSERT INTO submissions (dagId, data) VALUES (...)

6. MySQL devuelve el registro creado con ID autoincrementado

7. Service devuelve el objeto al Controller

8. Controller devuelve respuesta HTTP 201 (Created) al Frontend

9. Frontend recibe:
   { id: 1, dagId: "informe_ventas", data: {...}, createdAt, updatedAt }
```

---

# 🎨 FRONTEND - Estructura Angular

## 📁 Estructura de Carpetas

```
FrontAirFlow/src/
├── main.ts                    ← Punto de entrada (inicializa Angular)
├── index.html                 ← HTML raíz (donde se renderiza la app)
├── polyfills.ts               ← Compatibilidad con navegadores antiguos
├── styles.css                 ← Estilos globales
│
└── app/                        ← Tu aplicación Angular
    ├── app.component.ts       ← Componente raíz
    ├── app.component.html     ← Plantilla raíz
    ├── app.module.ts          ← Módulo raíz (configura toda la app)
    │
    └── dynamic-form/          ← Componente: Formularios Dinámicos
        ├── dynamic-form.component.ts      ← Lógica TypeScript
        ├── dynamic-form.component.html    ← Plantilla HTML
        └── dynamic-form.component.css     ← Estilos CSS
```

## 🏗️ Conceptos Clave de Angular

### 1️⃣ **NgModule** - Contenedor de la aplicación

Define qué componentes, servicios, módulos están disponibles.

```typescript
// app.module.ts
@NgModule({
  declarations: [AppComponent, DynamicFormComponent],  // ← Componentes
  imports: [                                            // ← Módulos importados
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,              // ← Para hacer HTTP requests
    ReactiveFormsModule,            // ← Para formularios reactivos
    RouterModule.forRoot(routes),   // ← Para routing
    MatFormFieldModule,             // ← Material: campos de formulario
    MatInputModule,                 // ← Material: inputs
    MatButtonModule,                // ← Material: botones
    // ... otros módulos de Material
  ],
  bootstrap: [AppComponent]  // ← Componente raíz
})
export class AppModule {}
```

**¿Para qué?** Configurar toda la aplicación.

### 2️⃣ **Component** - Unidad de UI

Un componente es una clase que controla una porción de la pantalla.

```typescript
@Component({
  selector: 'app-dynamic-form',        // ← Cómo usarlo en HTML: <app-dynamic-form></app-dynamic-form>
  templateUrl: './dynamic-form.component.html',  // ← HTML
  styleUrls: ['./dynamic-form.component.css']    // ← CSS
})
export class DynamicFormComponent implements OnInit {
  // Propiedades y métodos aquí
}
```

**¿Para qué?** Encapsular lógica con su vista (HTML) y estilos.

### 3️⃣ **Template** (HTML) - Vista

Define cómo se ve el componente.

```html
<!-- dynamic-form.component.html -->
<h2>{{ template.description }}</h2>  <!-- Data binding -->

<form [formGroup]="form" (ngSubmit)="onSubmit()">  <!-- Property y event binding -->
  <input [formControlName]="field.name" />  <!-- Reactive forms -->
  <button type="submit">Enviar</button>
</form>
```

**¿Para qué?** Mostrar datos al usuario de forma reactiva.

### 4️⃣ **Routing** - Navegación

Define qué componente se muestra en qué ruta.

```typescript
const routes: Routes = [
  { path: 'formularios/:dagId', component: DynamicFormComponent },
  { path: '**', redirectTo: 'formularios/informe_ventas' }
];
```

**¿Para qué?** Navegar entre diferentes vistas sin recargar la página.

---

## 📋 Detalles del Componente Principal

### **DynamicFormComponent**

```
Ubicación: src/app/dynamic-form/

Responsabilidad: Formulario dinámico que:
  1. Carga template de CouchDB
  2. Construye formulario basado en template
  3. Permite al usuario rellenar y enviar
  4. Guarda envío en MySQL
  5. Muestra lista de envíos previos

Propiedades principales:
  - form: FormGroup              ← Formulario reactivo
  - template: Template           ← Estructura cargada de CouchDB
  - templateName: string         ← Nombre del template (ej: "informe_ventas")
  - submissions: any[]           ← Lista de envíos de MySQL

Métodos principales:
  - ngOnInit()                   ← Ciclo de vida: se ejecuta al cargar
  - loadTemplate(name)           ← GET /templates/:name (CouchDB)
  - buildForm(fields)            ← Construye FormGroup dinámicamente
  - onSubmit()                   ← POST /submissions (MySQL)
  - getSubmissions()             ← GET /submissions (MySQL)
  - deleteSubmission(id)         ← DELETE /submissions/:id (MySQL)
```

---

## 🔌 Flujo de Información en Angular

```
Usuario abre navegador
         ↓
HTML carga (index.html)
         ↓
Angular bootstrap (main.ts)
         ↓
AppModule carga
         ↓
AppComponent se renderiza (<app-root></app-root>)
         ↓
Router evalúa URL actual
         ↓
DynamicFormComponent se instantia
         ↓
ngOnInit() se ejecuta
         ↓
loadTemplate() hace GET a /templates/:name
         ↓
HttpClient envía solicitud HTTP
         ↓
Backend responde con template
         ↓
template se asigna a this.template
         ↓
buildForm() construye FormGroup
         ↓
Formulario se renderiza en HTML
         ↓
Usuario rellena formulario
         ↓
Usuario hace click en "Enviar"
         ↓
onSubmit() se ejecuta
         ↓
HttpClient envía POST a /submissions
         ↓
Backend devuelve confirmación
         ↓
getSubmissions() actualiza lista
         ↓
Se muestra lista de envíos
```

---

# 🔄 FLUJO DE DATOS COMPLETO

## Escenario: Usuario Carga Formulario de "Informe de Ventas"

### Paso 1: Usuario navega a la URL

```
Usuario abre: http://localhost:4200/formularios/informe_ventas
```

### Paso 2: Angular Router

```typescript
// app.module.ts
const routes: Routes = [
  { path: 'formularios/:dagId', component: DynamicFormComponent },
  // ...
];

// Resultado: DynamicFormComponent se instancia con dagId="informe_ventas"
```

### Paso 3: DynamicFormComponent se carga

```typescript
// dynamic-form.component.ts
ngOnInit(): void {
  this.templateName = this.route.snapshot.paramMap.get('dagId');  // "informe_ventas"
  this.loadTemplate(this.templateName);  // GET /templates/informe_ventas
}
```

### Paso 4: Angular solicita template a NestJS

```typescript
loadTemplate(templateName: string): void {
  this.http.get<Template>(`http://localhost:3000/templates/${templateName}`).subscribe({
    next: (template) => {
      this.template = template;
      this.buildForm(template.fields);
      this.getSubmissions();
    }
  });
}

// HTTP REQUEST:
// GET http://localhost:3000/templates/informe_ventas
// Headers: Accept: application/json
```

### Paso 5: NestJS recibe solicitud

```typescript
// templates.controller.ts
@Get(':templateName')
async getTemplate(@Param('templateName') templateName: string) {
  const template = await this.templatesService.getTemplateByName(templateName);
  return template;
}
```

### Paso 6: NestJS consulta CouchDB

```typescript
// templates.service.ts
async getTemplateByName(templateName: string): Promise<any> {
  const result = await this.db.find({
    selector: { name: templateName },  // Busca documento con name="informe_ventas"
  });
  return result.docs[0];
}

// Conexión a CouchDB:
// URL: http://admin:password@localhost:5984/templates
// Query: _find con selector { name: "informe_ventas" }
```

### Paso 7: CouchDB devuelve documento

```json
{
  "_id": "abc123",
  "_rev": "1-xyz",
  "name": "informe_ventas",
  "reportName": "Informe de Ventas 2026",
  "description": "Genera un informe completo de ventas por región",
  "fields": [
    { "name": "fecha_inicio", "label": "Fecha Inicio", "type": "date" },
    { "name": "fecha_fin", "label": "Fecha Fin", "type": "date" },
    { "name": "region", "label": "Región", "type": "select", "options": ["Norte", "Sur", "Este", "Oeste"] },
    { "name": "top_n", "label": "Top N Productos", "type": "number" }
  ]
}
```

### Paso 8: NestJS devuelve documento a Angular

```typescript
// Response HTTP
HTTP 200 OK
Content-Type: application/json
Body: { name: "informe_ventas", fields: [...] }
```

### Paso 9: Angular construye el formulario

```typescript
buildForm(fields: Field[]): void {
  const group: any = {};
  fields.forEach(field => {
    group[field.name] = [''];  // Crear FormControl vacío para cada campo
  });
  this.form = this.fb.group(group);
}

// Resultado:
// FormGroup: {
//   fecha_inicio: FormControl(''),
//   fecha_fin: FormControl(''),
//   region: FormControl(''),
//   top_n: FormControl('')
// }
```

### Paso 10: Angular renderiza el formulario en HTML

```html
<!-- dynamic-form.component.html -->
<h2>Genera un informe completo de ventas por región</h2>

<form [formGroup]="form" (ngSubmit)="onSubmit()">
  
  <!-- Fecha Inicio (type="date") -->
  <mat-form-field>
    <mat-label>Fecha Inicio</mat-label>
    <input matInput type="date" formControlName="fecha_inicio" />
  </mat-form-field>
  
  <!-- Fecha Fin (type="date") -->
  <mat-form-field>
    <mat-label>Fecha Fin</mat-label>
    <input matInput type="date" formControlName="fecha_fin" />
  </mat-form-field>
  
  <!-- Región (select) -->
  <mat-form-field>
    <mat-label>Región</mat-label>
    <mat-select formControlName="region">
      <mat-option value="Norte">Norte</mat-option>
      <mat-option value="Sur">Sur</mat-option>
      <mat-option value="Este">Este</mat-option>
      <mat-option value="Oeste">Oeste</mat-option>
    </mat-select>
  </mat-form-field>
  
  <!-- Top N Productos (number) -->
  <mat-form-field>
    <mat-label>Top N Productos</mat-label>
    <input matInput type="number" formControlName="top_n" />
  </mat-form-field>
  
  <button mat-raised-button color="primary" type="submit">Enviar</button>
</form>
```

### Paso 11: Usuario rellena el formulario

```
fecha_inicio: 2026-01-01
fecha_fin: 2026-03-02
region: Norte
top_n: 10
```

### Paso 12: Usuario hace click en "Enviar"

```html
<button mat-raised-button color="primary" type="submit">Enviar</button>
<!-- Emite evento (ngSubmit) que llama a onSubmit() -->
```

### Paso 13: Angular envía datos a NestJS

```typescript
onSubmit(): void {
  if (this.form.valid) {
    const payload = { 
      dagId: 'informe_ventas', 
      data: {
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-03-02',
        region: 'Norte',
        top_n: 10
      }
    };
    this.http.post(`http://localhost:3000/submissions`, payload).subscribe({
      next: () => {
        alert('Formulario enviado y guardado correctamente.');
        this.getSubmissions();  // Actualiza lista
      }
    });
  }
}

// HTTP REQUEST:
// POST http://localhost:3000/submissions
// Body: {
//   "dagId": "informe_ventas",
//   "data": {
//     "fecha_inicio": "2026-01-01",
//     "fecha_fin": "2026-03-02",
//     "region": "Norte",
//     "top_n": 10
//   }
// }
```

### Paso 14: NestJS recibe el formulario

```typescript
// submissions.controller.ts
@Post()
create(@Body() createSubmissionDto: CreateSubmissionDto) {
  return this.submissionsService.create(
    createSubmissionDto.dagId,
    createSubmissionDto.data
  );
}
```

### Paso 15: NestJS guarda en MySQL

```typescript
// submissions.service.ts
async create(dagId: string, data: Record<string, any>): Promise<Submission> {
  const submission = this.submissionRepository.create({ dagId, data });
  return this.submissionRepository.save(submission);
}

// TypeORM genera SQL:
// INSERT INTO submissions (dagId, data, createdAt, updatedAt)
// VALUES ('informe_ventas', '{"fecha_inicio":"2026-01-01",...}', NOW(), NOW());

// MySQL devuelve:
// {
//   id: 1,
//   dagId: 'informe_ventas',
//   data: { fecha_inicio: '2026-01-01', ... },
//   createdAt: 2026-03-02T09:15:00Z,
//   updatedAt: 2026-03-02T09:15:00Z
// }
```

### Paso 16: NestJS devuelve confirmación a Angular

```typescript
// Response HTTP
HTTP 201 CREATED
Body: {
  id: 1,
  dagId: 'informe_ventas',
  data: { ... },
  createdAt: '2026-03-02T09:15:00Z',
  updatedAt: '2026-03-02T09:15:00Z'
}
```

### Paso 17: Angular obtiene lista actualizada

```typescript
getSubmissions(): void {
  this.http.get<any[]>(`http://localhost:3000/submissions`).subscribe({
    next: (list) => {
      this.submissions = list;  // Actualiza propiedad
      // Template se actualiza automáticamente (2-way binding)
    }
  });
}

// HTTP REQUEST:
// GET http://localhost:3000/submissions
```

### Paso 18: NestJS devuelve lista de MySQL

```typescript
// submissions.controller.ts
@Get()
findAll() {
  return this.submissionsService.findAll();
}

// submissions.service.ts
async findAll(): Promise<Submission[]> {
  return this.submissionRepository.find({
    order: { createdAt: 'DESC' }  // Ordenado por más reciente primero
  });
}

// TypeORM genera SQL:
// SELECT * FROM submissions ORDER BY createdAt DESC;

// Devuelve:
// [
//   { id: 3, dagId: 'reporte_usuarios', data: {...}, createdAt: '2026-03-02T09:10:00Z' },
//   { id: 2, dagId: 'informe_ventas', data: {...}, createdAt: '2026-03-02T09:05:00Z' },
//   { id: 1, dagId: 'informe_ventas', data: {...}, createdAt: '2026-03-02T09:00:00Z' }
// ]
```

### Paso 19: Angular renderiza lista

```html
<!-- dynamic-form.component.html -->
<section *ngIf="submissions?.length" class="submissions-list">
  <h3>Submissions recientes</h3>
  <ul>
    <li *ngFor="let s of submissions" class="submission-item">
      <strong>{{ s.dagId }}</strong> — {{ s.createdAt | date:'short' }}
      <pre>{{ s.data | json }}</pre>
      <button mat-button color="warn" (click)="deleteSubmission(s.id)">Eliminar</button>
    </li>
  </ul>
</section>

<!-- Renderizado:
<section class="submissions-list">
  <h3>Submissions recientes</h3>
  <ul>
    <li class="submission-item">
      <strong>reporte_usuarios</strong> — 3/2/26, 9:10 AM
      <pre>{ "..."}</pre>
      <button (click)="deleteSubmission(3)">Eliminar</button>
    </li>
    <li class="submission-item">
      <strong>informe_ventas</strong> — 3/2/26, 9:05 AM
      <pre>{ "..."}</pre>
      <button (click)="deleteSubmission(2)">Eliminar</button>
    </li>
    ...
  </ul>
</section>
-->
```

### Paso 20: Usuario ve el formulario completado y lista

✅ **Formulario renderizado**
✅ **Datos guardados en MySQL**
✅ **Lista de envíos mostrada**

---

# 💡 CÓMO FUNCIONA NODEJS/NESTJS

## Conceptos Básicos

### ¿Qué es Node.js?

Node.js es un **runtime de JavaScript en el servidor**. Permite ejecutar JavaScript fuera del navegador.

```javascript
// Normalmente JavaScript solo funciona en navegadores:
// <script>
//   console.log("Hola desde el navegador");
// </script>

// Con Node.js puedes ejecutar JavaScript en el servidor:
// node script.js
// Output: Hola desde el servidor
```

### ¿Qué es NestJS?

NestJS es un **framework de Node.js** que proporciona estructura y herramientas para construir servidores web escalables.

```typescript
// Sin NestJS (Node.js puro):
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/templates/informe_ventas') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ name: 'informe_ventas', fields: [...] }));
  }
});
server.listen(3000);

// Con NestJS (mucho más limpio):
@Controller('templates')
export class TemplatesController {
  @Get(':templateName')
  getTemplate(@Param('templateName') name: string) {
    return this.templatesService.getTemplateByName(name);
  }
}
```

---

## Arquitectura de NestJS

```
REQUEST HTTP desde Frontend
        ↓
MAIN.TS (punto de entrada)
        ↓
APP.MODULE (configuración)
        ↓
CONTROLLER (recibe request)
        ↓
SERVICE (lógica)
        ↓
DATABASE (MySQL/CouchDB)
        ↓
SERVICE (procesa)
        ↓
CONTROLLER (responde)
        ↓
RESPONSE HTTP al Frontend
```

### Ejemplo: GET /templates/informe_ventas

```
1. Frontend envía request:
   GET /templates/informe_ventas

2. NestJS router identifica que es para TemplatesController
   @Controller('templates')
   
3. Router busca coincidencia exacta:
   @Get(':templateName')  ← Coincide, templateName="informe_ventas"

4. Controller llama al Service:
   return this.templatesService.getTemplateByName('informe_ventas');

5. Service accede a CouchDB:
   const result = await this.db.find({ selector: { name: 'informe_ventas' } });

6. CouchDB devuelve documento

7. Service devuelve al Controller

8. Controller devuelve respuesta HTTP
   HTTP 200
   Body: { name: 'informe_ventas', fields: [...] }

9. Frontend recibe respuesta
```

---

## Inyección de Dependencias

NestJS usa **Inyección de Dependencias** para pasar servicios a controladores.

```typescript
// Sin inyección (difícil de testear):
class TemplatesController {
  private service = new TemplatesService();  // Hardcoded
}

// Con inyección (recomendado):
class TemplatesController {
  constructor(private readonly service: TemplatesService) {}
  // NestJS automáticamente instancia y pasa el service
}
```

**¿Para qué?**
- Facilita testing (puedes pasar un mock)
- Evita duplicar instancias
- Aplicación más desacoplada

---

## Decoradores (el "azúcar sintáctico" de NestJS)

Los decoradores son funciones que modifican clases/métodos.

```typescript
@Controller('templates')     // ← Decorador: marca la clase como controller
export class TemplatesController {
  
  @Get(':templateName')     // ← Decorador: marca método como GET
  async getTemplate(@Param('templateName') name: string) {
    //                 ↑
    //          Decorador: extrae parámetro de ruta
  }
}
```

**¿Para qué?** Agregar funcionalidad a clases/métodos de forma declarativa.

---

## TypeORM - Acceso a Base de Datos

TypeORM es un **ORM** (Object-Relational Mapping) que mapea objetos JavaScript a filas de BD.

```typescript
// Sin ORM (SQL puro):
const sql = "SELECT * FROM submissions WHERE id = 1";
const result = await connection.query(sql);

// Con TypeORM (más seguro y tipo-seguro):
const submission = await submissionRepository.findOne({ where: { id: 1 } });
// TypeORM genera el SQL automáticamente y devuelve un objeto fuertemente tipado
```

**Flujo de TypeORM:**

```
JavaScript Entity (clase)
        ↓
TypeORM mapea a SQL
        ↓
Ejecuta en MySQL
        ↓
Respuesta SQL
        ↓
TypeORM mapea a JavaScript
        ↓
Observable/Promise
```

---

## Async/Await - Operaciones Asincrónicas

Node.js es **no-bloqueante**. Cuando esperas una BD, no bloquea otras solicitudes.

```typescript
// Sin async/await (callbacks):
function getTemplate(name, callback) {
  db.find({ selector: { name: name } }, function(err, result) {
    if (err) callback(err);
    else callback(null, result);
  });
}

// Con async/await (mucho más legible):
async function getTemplate(name: string) {
  const result = await db.find({ selector: { name: name } });
  return result;
}

// El servidor puede atender múltiples clientes simultáneamente
// GET /templates/template1  ← espera BD pero no bloquea
// GET /templates/template2  ← se atiende mientras template1 espera
```

---

# 💡 CÓMO FUNCIONA ANGULAR

## Concepto General

Angular es un **framework para construir aplicaciones web interactivas en el navegador**.

```
HTML estático                 ┌─────────────────────┐
        ↓                     │  Navegador          │
        HTML                  │                     │
        ↓                     │  - Ejecuta JS       │
Navegador carga               │  - Renderiza HTML   │
        ↓                     │  - Manda (REST API) │
JavaScript se ejecuta         │                     │
        ↓                     └─────────────────────┘
Angular bootstrap
        ↓
AppModule se carga
        ↓
AppComponent se renderiza
        ↓
Router navega
        ↓
Componentes se instancian
        ↓
Templates se renderizn
        ↓
Usuario interactúa
        ↓
Event handlers se ejecutan
        ↓
Estado cambia
        ↓
Templates se actualizan (2-way binding)
```

---

## Ciclo de Vida de un Componente

Angular ejecuta código en momentos específicos:

```typescript
export class DynamicFormComponent implements OnInit {
  
  // 1. Constructor
  constructor(private http: HttpClient) {
    console.log('Constructor ejecutado');
  }
  
  // 2. OnInit (se ejecuta una vez, después del constructor)
  ngOnInit(): void {
    console.log('ngOnInit ejecutado');
    this.loadTemplate();  // Aquí cargas datos iniciales
  }
  
  // 3. AfterViewInit (se ejecuta después de renderizar el template)
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit ejecutado');
  }
  
  // 4. OnDestroy (se ejecuta cuando el componente se destruye)
  ngOnDestroy(): void {
    console.log('ngOnDestroy ejecutado');
  }
}
```

**Orden de ejecución:**

```
1. Constructor
2. Propiedades iniciales asignadas
3. ngOnInit ejecutado
4. Template se renderiza
5. ngAfterViewInit ejecutado
6. ...elemento vive en la pantalla...
7. ngOnDestroy ejecutado (cuando se navega a otro componente)
```

---

## Reactive Forms - Formularios Reactivos

Angular proporciona dos formas de trabajar con formularios:

### Template-driven (antiguo)

```html
<form ngNoValidate #form="ngForm" (ngSubmit)="onSubmit()">
  <input name="email" [(ngModel)]="email" />
  <button type="submit">Enviar</button>
</form>
```

### Reactive (moderno, lo que usamos)

```typescript
// TypeScript
this.form = this.fb.group({
  email: [''],
  password: ['']
});

// HTML
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="email" />
  <input formControlName="password" />
  <button type="submit">Enviar</button>
</form>
```

**¿Por qué reactive?**
- Control total desde TypeScript
- Mejor para formularios dinámicos (como el nuestro)
- Más fácil de testear
- Más rendimiento

---

## Data Binding - Comunicación entre TypeScript y HTML

### 1️⃣ Property Binding ({{ }})

Muestra datos del TypeScript en el HTML.

```typescript
// TypeScript
export class DynamicFormComponent {
  title = 'Mi Formulario';
}

// HTML
<h1>{{ title }}</h1>  ← Muestra "Mi Formulario"
```

### 2️⃣ Event Binding ((click))

Ejecuta código cuando el usuario interactúa.

```html
<!-- HTML -->
<button (click)="onSubmit()">Enviar</button>

<!-- Cuando el usuario hace click, se ejecuta onSubmit() en TypeScript -->
```

### 3️⃣ Two-way Binding ([(...)])

Sincronización bidireccional.

```html
<input [(ngModel)]="email" />

<!-- Si el usuario escribe en el input, this.email se actualiza -->
<!-- Si cambias this.email desde TypeScript, el input se actualiza -->
```

### 4️⃣ Property Binding ([prop])

Establece propiedades de elementos.

```html
<input [value]="email" />
<input [disabled]="isDisabled" />
<div [style.color]="colorValue"></div>
```

---

## Directivas - Lógica en el HTML

Las directivas modifican el comportamiento del HTML.

### *ngIf - Mostrar/Ocultar

```html
<div *ngIf="isLoading">Cargando...</div>
<div *ngIf="!isLoading && submissions?.length">
  <p>Tienes {{ submissions.length }} envíos</p>
</div>
```

### *ngFor - Repetir elementos

```html
<div *ngFor="let field of template.fields">
  <input [formControlName]="field.name" />
</div>

<!-- Se crea un div para cada field en template.fields -->
```

### [ngSwitch] - Switch case

```html
<div [ngSwitch]="field.type">
  <input *ngSwitchCase="'string'" type="text" />
  <input *ngSwitchCase="'number'" type="number" />
  <input *ngSwitchCase="'date'" type="date" />
</div>
```

---

## HttpClient - Comunicación con Backend

Angular proporciona `HttpClient` para hacer llamadas HTTP.

```typescript
constructor(private http: HttpClient) {}

// GET
this.http.get('/api/users').subscribe((data) => {
  console.log(data);
});

// POST
this.http.post('/api/users', { name: 'John' }).subscribe((result) => {
  console.log('Usuario creado:', result);
});

// PUT
this.http.put(`/api/users/${id}`, updatedData).subscribe(...);

// DELETE
this.http.delete(`/api/users/${id}`).subscribe(...);
```

### Observables vs Promises

```typescript
// Promise (una sola respuesta, .then())
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data));

// Observable (múltiples respuestas, .subscribe())
this.http.get('/api/data').subscribe(
  (data) => console.log(data),           // Siguiente dato
  (error) => console.error(error),       // Error
  () => console.log('Completado')        // Completado
);
```

En nuestro proyecto usamos **Observables** porque RxJS (la librería de Angular) es poderosa.

---

## Routing - Navegación

Angular Router permite navegar sin recargar la página.

```typescript
// app.module.ts
const routes: Routes = [
  { path: 'formularios/:dagId', component: DynamicFormComponent },
  { path: '', redirectTo: 'formularios/informe_ventas', pathMatch: 'full' },
  { path: '**', redirectTo: 'formularios/informe_ventas' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)]
})
export class AppModule {}
```

**¿Cómo funciona?**

```
Usuario abre: http://localhost:4200/formularios/informe_ventas
        ↓
Router interpreta la ruta
        ↓
Busca coincidencia en routes array
        ↓
Encuentra: { path: 'formularios/:dagId', component: DynamicFormComponent }
        ↓
Instancia DynamicFormComponent con dagId="informe_ventas"
        ↓
Component accede a ActivatedRoute para obtener parámetro
        ↓
Se renderiza el componente
```

```typescript
export class DynamicFormComponent {
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit() {
    this.dagId = this.route.snapshot.paramMap.get('dagId');  // "informe_ventas"
  }
}
```

---

## Material Design - Componentes UI

Angular Material proporciona componentes bonitos y reutilizables.

```typescript
// app.module.ts
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@NgModule({
  imports: [
    MatButtonModule,      // <button mat-raised-button>Enviar</button>
    MatInputModule,       // <input matInput />
    MatSelectModule       // <mat-select><mat-option>
  ]
})
export class AppModule {}
```

---

# 📊 RESUMEN VISUAL

## Backend Flow

```
┌──────────────────────────────────────────────────────────────┐
│                       NestJS BACKEND                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  main.ts (entrada)                                            │
│    ↓                                                           │
│  app.module.ts (configura AppModule)                          │
│    ├─ HttpModule (para Airflow API)                          │
│    ├─ TypeOrmModule (para MySQL)                             │
│    └─ DagsModule, TemplatesModule, SubmissionsModule         │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  MÓDULO: Templates (CouchDB)                         │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  GET /templates/test         → getAllTemplates()     │    │
│  │  GET /templates/:templateName → getTemplateByName()  │    │
│  │                                                       │    │
│  │  CouchDB: http://admin:password@localhost:5984      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  MÓDULO: Submissions (MySQL)                         │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  POST   /submissions         → create()              │    │
│  │  GET    /submissions         → findAll()             │    │
│  │  GET    /submissions/:id     → findOne()             │    │
│  │  PUT    /submissions/:id     → update()              │    │
│  │  DELETE /submissions/:id     → remove()              │    │
│  │                                                       │    │
│  │  MySQL: localhost:3306/airflow                       │    │
│  │  Tabla: submissions (id, dagId, data, createdAt)    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  MÓDULO: Dags (Airflow API)                          │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  GET /dags                   → listDags()            │    │
│  │  POST /dags/:dagId/trigger   → triggerDag()          │    │
│  │                                                       │    │
│  │  Airflow: http://10.236.197.9:8080/api/v1            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Puerto: 3000                                                  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Frontend Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      ANGULAR FRONTEND                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  index.html (HTML raíz)                                       │
│    ↓                                                           │
│  main.ts (bootstrap)                                          │
│    ↓                                                           │
│  app.module.ts (configura AppModule)                          │
│    ├─ BrowserModule                                           │
│    ├─ BrowserAnimationsModule                                 │
│    ├─ HttpClientModule                                        │
│    ├─ ReactiveFormsModule                                     │
│    ├─ RouterModule (rutas)                                    │
│    └─ Material Modules                                        │
│                                                                │
│  app.component.ts/html (raíz)                                 │
│    ↓                                                           │
│  Router (+formularios/:dagId)                                 │
│    ↓                                                           │
│  ┌──────────────────────────────────────────┐                │
│  │  DynamicFormComponent                    │                │
│  ├──────────────────────────────────────────┤                │
│  │  form: FormGroup                         │                │
│  │  template: Template (de CouchDB)         │                │
│  │  submissions: any[]  (de MySQL)          │                │
│  │                                           │                │
│  │  Métodos:                                │                │
│  │  - loadTemplate()      [GET /templates]  │                │
│  │  - buildForm()         [FormBuilder]     │                │
│  │  - onSubmit()          [POST /submissions]│               │
│  │  - getSubmissions()    [GET /submissions]│                │
│  │  - deleteSubmission()  [DELETE /submit..] │               │
│  │                                           │                │
│  │  HTML:                                   │                │
│  │  - Form dinámico (con *ngFor, ngSwitch) │                │
│  │  - Lista de submissions (con *ngFor)    │                │
│  └──────────────────────────────────────────┘                │
│                                                                │
│  Puerto: 4200                                                  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

# 🎓 RESUMEN FINAL

## Backend (Node.js / NestJS)

✅ **¿Qué hace?**
- Escucha solicitudes HTTP en puerto 3000
- Conecta a CouchDB para obtener templates
- Conecta a MySQL para guardar/recuperar envíos
- Devuelve JSON al frontend

✅ **Architektura**
- Modular: Dags, Templates (CouchDB), Submissions (MySQL)
- Service → Controller: Lógica separada del routing
- TypeORM: ORM para MySQL
- nano: cliente para CouchDB

✅ **No-bloqueante**
- Usa async/await
- Múltiples clientes pueden conectarse simultáneamente

---

## Frontend (Angular)

✅ **¿Qué hace?**
- Corre en el navegador
- Solicita templates a NestJS
- Construye formularios dinámicamente
- Envía datos a NestJS para guardar
- Muestra lista de envíos

✅ **Arquitectura**
- Component-based: Componente raíz + DynamicFormComponent
- Reactive Forms: Control total desde TypeScript
- HttpClient: Comunicación con backend
- Router: Navegación entre rutas

✅ **Interactivo**
- Event binding: (click), (ngSubmit)
- Two-way binding: [(ngModel)]
- Data binding: {{ datos }}, [propiedad]

---

**¡Así funciona tu aplicación!** 🚀

