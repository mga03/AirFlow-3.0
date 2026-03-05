import { Controller, Get, Param } from '@nestjs/common';
import { TemplatesService } from './templates.service';

/**
 * TemplatesController
 * 
 * Controlador REST que expone endpoints para acceder a los templates de CouchDB.
 * 
 * **Endpoints**:
 * - `GET /templates/test` - Endpoint de test (REQUISITO 3): devuelve TODOS los templates
 * - `GET /templates/:templateName` - Obtiene un template específico por nombre
 * 
 * **Flujo típico**:
 * 1. Frontend realiza `GET /templates/informe_ventas`
 * 2. Controller recibe la solicitud y llama a `templatesService.getTemplateByName('informe_ventas')`
 * 3. Service consulta CouchDB por un documento con `name: 'informe_ventas'`
 * 4. CouchDB devuelve el documento con su estructura de campos
 * 5. Frontend recibe la estructura y renderiza un formulario dinámico
 * 
 * **Requisito**: El endpoint `/templates/test` es el endpoint de test para confirmar
 * que CouchDB está correctamente integrado en el backend.
 */
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * GET /templates/test
   * **Endpoint de test (REQUISITO 3)**
   * 
   * Devuelve TODOS los templates almacenados en CouchDB.
   * Útil para verificar que:
   * - CouchDB está conectado
   * - Base de datos `templates` existe
   * - Hay documentos en la colección
   * 
   * **Respuesta esperada**:
   * ```json
   * [
   *   {
   *     "_id": "abc123",
   *     "_rev": "1-xyz",
   *     "name": "informe_ventas",
   *     "description": "Formulario para generar informe de ventas",
   *     "fields": [...]
   *   },
   *   {
   *     "_id": "def456",
   *     "_rev": "1-abc",
   *     "name": "reporte_usuarios",
   *     "description": "Formulario para generar reporte de usuarios",
   *     "fields": [...]
   *   }
   * ]
   * ```
   */
  @Get('test')
  async test() {
    return this.templatesService.getAllTemplates();
  }

  /**
   * GET /templates/:templateName
   * 
   * Obtiene un template específico por su nombre.
   * Usado por el frontend para cargar la estructura del formulario.
   * 
   * **Parámetros**:
   * - `templateName` - Nombre del template (ej: "informe_ventas")
   * 
   * **Respuesta exitosa**:
   * ```json
   * {
   *   "_id": "abc123",
   *   "_rev": "1-xyz",
   *   "name": "informe_ventas",
   *   "reportName": "informe_ventas",
   *   "description": "Formulario para generar informe de ventas",
   *   "fields": [
   *     { "name": "fecha_inicio", "label": "Fecha de inicio", "type": "date" },
   *     { "name": "fecha_fin", "label": "Fecha de fin", "type": "date" },
   *     { "name": "region", "label": "Región", "type": "select", "options": ["Norte", "Sur", "Este", "Oeste"] },
   *     { "name": "top_n", "label": "Top N productos", "type": "number" }
   *   ]
   * }
   * ```
   * 
   * **Respuesta si no existe**:
   * ```json
   * { "error": "Template templateName not found" }
   * ```
   */
  @Get(':templateName')
  async getTemplate(@Param('templateName') templateName: string) {
    const template = await this.templatesService.getTemplateByName(templateName);
    if (!template) {
      return { error: `Template ${templateName} not found` };
    }
    return template;
  }
}
