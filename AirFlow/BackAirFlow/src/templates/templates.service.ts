import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nano from 'nano';

/**
 * TemplatesService
 * 
 * Servicio encargado de la gestión de templates almacenados en CouchDB.
 * 
 * **Base de datos**: CouchDB (NoSQL, sin esquema)
 * **Base de datos específica**: `templates`
 * **Librería cliente**: `nano` (cliente Node.js nativo para CouchDB)
 * 
 * **Responsabilidades**:
 * - Conectar a CouchDB en `onModuleInit` (cuando NestJS inicia el módulo)
 * - Listar todos los templates disponibles
 * - Buscar un template específico por nombre (field `name`)
 * - Crear nuevos templates en la BD
 * 
 * **Estructura de documento CouchDB**:
 * ```json
 * {
 *   "_id": "auto-generated-id",
 *   "_rev": "version",
 *   "name": "informe_ventas",
 *   "reportName": "informe_ventas",
 *   "description": "Formulario para generar informe de ventas",
 *   "fields": [
 *     { "name": "fecha_inicio", "label": "Fecha inicio", "type": "date" },
 *     { "name": "region", "label": "Región", "type": "select", "options": ["Norte", "Sur"] }
 *   ]
 * }
 * ```
 * 
 * **Requisito implementado**: CouchDB para almacenar templates dinámicos
 */
@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);
  private db: nano.DocumentScope<any>;
  private nanoInstance: nano.ServerScope;

  /**
   * Se ejecuta cuando NestJS carga el módulo.
   * Establece la conexión a CouchDB usando la URL de entorno.
   */
  async onModuleInit() {
    // Conectar a CouchDB al inicializar el módulo
    const couchdbUrl = process.env.COUCHDB_URL || 'http://localhost:5984';
    this.nanoInstance = nano(couchdbUrl);
    
    try {
      // Obtener acceso a la base de datos `templates`
      this.db = this.nanoInstance.db.use('templates');
      this.logger.log(`Connected to CouchDB at ${couchdbUrl}`);
    } catch (error) {
      this.logger.error('Failed to connect to CouchDB', error);
    }
  }

  /**
   * Obtiene TODOS los templates almacenados en CouchDB.
   * Usado por endpoint `GET /templates/test` (endpoint de test requerido).
   * 
   * @returns Array de objetos template
   */
  async getAllTemplates(): Promise<any[]> {
    try {
      const result = await this.db.list({ include_docs: true });
      // Filtrar documentos de diseño (comienzan con '_') y devolver solo los reales
      return result.rows
        .filter(row => !row.id.startsWith('_'))
        .map(row => row.doc);
    } catch (error) {
      this.logger.error('Error fetching templates', error);
      throw error;
    }
  }

  /**
   * Obtiene UN template específico por su nombre.
   * Usa `find()` de nano para buscar por el campo `name`.
   * 
   * @param templateName - Nombre del template (ej: "informe_ventas")
   * @returns Objeto template o null si no existe
   */
  async getTemplateByName(templateName: string): Promise<any> {
    try {
      const result = await this.db.find({
        selector: { name: templateName },
      });
      if (result.docs.length === 0) {
        return null;
      }
      return result.docs[0];
    } catch (error) {
      this.logger.error(`Error fetching template ${templateName}`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo template en CouchDB.
   * 
   * @param name - Nombre del template
   * @param data - Objeto con los campos del template (description, fields, etc)
   * @returns Respuesta de CouchDB con _id y _rev
   */
  async createTemplate(name: string, data: any): Promise<any> {
    try {
      const result = await this.db.insert({ name, ...data });
      this.logger.log(`Template ${name} created`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating template ${name}`, error);
      throw error;
    }
  }
}
