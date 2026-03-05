import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';

/**
 * SubmissionsService
 * 
 * Servicio encargado de la gestión de envíos (submissions) almacenados en MySQL.
 * 
 * **Base de datos**: MySQL (SQL relacional, con esquema)
 * **Tabla**: `submissions`
 * **ORM**: TypeORM (mapeo objeto-relacional de NestJS)
 * 
 * **Responsabilidades**:
 * - Crear nuevos envíos desde los formularios del frontend
 * - Listar todos los envíos almacenados
 * - Obtener un envío específico por ID
 * - Actualizar un envío existente
 * - Eliminar un envío
 * 
 * **Estructura de la tabla MySQL**:
 * ```sql
 * CREATE TABLE submissions (
 *   id INT PRIMARY KEY AUTO_INCREMENT,
 *   dagId VARCHAR(255) NOT NULL,
 *   data JSON NOT NULL,
 *   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * );
 * ```
 * 
 * **Flujo típico**:
 * 1. Frontend envía formulario con `{ dagId, data }` a `POST /submissions`
 * 2. SubmissionsController recibe la solicitud
 * 3. Controller llama a `submissionsService.create(dagId, data)`
 * 4. Service crea una instancia de Submission y la guarda en MySQL
 * 5. Frontend obtiene confirmación y puede listar los envíos con `GET /submissions`
 * 
 * **Requisito implementado**: MySQL para almacenar envíos de formularios
 * (datos transaccionales que necesitan durabilidad y esquema bien definido)
 */
@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  /**
   * Constructor inyecta el Repository de TypeORM para la entidad Submission.
   * El Repository proporciona métodos CRUD y query builder.
   * 
   * @param submissionRepository - Repositorio TypeORM para operaciones CRUD
   */
  constructor(@InjectRepository(Submission) private submissionRepository: Repository<Submission>) {}

  /**
   * CREATE: Crea un nuevo envío en MySQL.
   * 
   * @param dagId - Identificador del DAG/template (ej: "informe_ventas")
   * @param data - Objeto JSON con los datos del formulario
   * @returns Objeto Submission guardado con su ID autoincrementado
   * 
   * **Ejemplo de uso**:
   * ```typescript
   * await submissionsService.create('informe_ventas', {
   *   fecha_inicio: '2026-01-01',
   *   fecha_fin: '2026-03-02',
   *   region: 'Norte',
   *   top_n: 10
   * })
   * // Devuelve: { id: 1, dagId: 'informe_ventas', data: {...}, createdAt, updatedAt }
   * ```
   */
  async create(dagId: string, data: Record<string, any>): Promise<Submission> {
    const submission = this.submissionRepository.create({ dagId, data });
    this.logger.log(`Creating submission for dag ${dagId}`);
    return this.submissionRepository.save(submission);
  }

  /**
   * READ: Obtiene TODOS los envíos ordenados por fecha más reciente primero.
   * 
   * @returns Array de objetos Submission con todos los registros
   * 
   * **Respuesta típica**:
   * ```json
   * [
   *   { "id": 3, "dagId": "informe_ventas", "data": {...}, "createdAt": "2026-03-02T08:50:00Z", "updatedAt": "2026-03-02T08:50:00Z" },
   *   { "id": 2, "dagId": "reporte_usuarios", "data": {...}, "createdAt": "2026-03-02T08:45:00Z", "updatedAt": "2026-03-02T08:45:00Z" },
   *   { "id": 1, "dagId": "informe_ventas", "data": {...}, "createdAt": "2026-03-02T08:40:00Z", "updatedAt": "2026-03-02T08:40:00Z" }
   * ]
   * ```
   */
  async findAll(): Promise<Submission[]> {
    return this.submissionRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * READ: Obtiene un envío específico por su ID.
   * 
   * @param id - ID numérico del envío
   * @returns Objeto Submission si existe
   * @throws NotFoundException si el ID no existe en la BD
   * 
   * **Ejemplo de uso**:
   * ```typescript
   * const submission = await submissionsService.findOne(1);
   * // Devuelve: { id: 1, dagId: 'informe_ventas', data: {...}, createdAt, updatedAt }
   * ```
   */
  async findOne(id: number): Promise<Submission> {
    const found = await this.submissionRepository.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Submission not found');
    return found;
  }

  /**
   * UPDATE: Actualiza un envío existente.
   * 
   * @param id - ID del envío a actualizar
   * @param data - Objeto parcial con los campos a actualizar (dagId o data)
   * @returns Objeto Submission actualizado
   * @throws NotFoundException si el ID no existe
   * 
   * **Ejemplo de uso**:
   * ```typescript
   * await submissionsService.update(1, { data: { top_n: 20 } });
   * // Actualiza solo el campo data, mantiene los otros igual
   * ```
   */
  async update(id: number, data: Partial<Submission>): Promise<Submission> {
    await this.submissionRepository.update(id, data);
    return this.findOne(id);
  }

  /**
   * DELETE: Elimina un envío de MySQL.
   * 
   * @param id - ID del envío a eliminar
   * @throws NotFoundException si el ID no existe
   * 
   * **Ejemplo de uso**:
   * ```typescript
   * await submissionsService.remove(1);
   * // Se elimina el registro con id=1 de la tabla submissions
   * ```
   */
  async remove(id: number): Promise<void> {
    const res = await this.submissionRepository.delete(id);
    if (res.affected === 0) throw new NotFoundException('Submission not found');
  }
}
