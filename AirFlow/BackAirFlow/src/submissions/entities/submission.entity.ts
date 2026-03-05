import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entidad Submission
 * 
 * Mapea la tabla `submissions` en MySQL.
 * Representa un envío de formulario realizado por un usuario en el frontend.
 * 
 * **Tabla MySQL**:
 * - Nombre: `submissions`
 * - Motor: InnoDB
 * - Índices: PK en `id`
 * 
 * **Campos**:
 * - `id`: Identificador único, autoincrementado
 * - `dagId`: Nombre del template/DAG (ej: "informe_ventas")
 * - `data`: Objeto JSON con los datos del formulario
 * - `createdAt`: Timestamp automático (se rellena al crear)
 * - `updatedAt`: Timestamp automático (se actualiza en cada cambio)
 * 
 * **Ejemplo de registro**:
 * ```
 * id: 1
 * dagId: "informe_ventas"
 * data: {
 *   "fecha_inicio": "2026-01-01",
 *   "fecha_fin": "2026-03-02",
 *   "region": "Norte",
 *   "top_n": 10
 * }
 * createdAt: 2026-03-02 08:50:30.000
 * updatedAt: 2026-03-02 08:50:30.000
 * ```
 * 
 * **ORM**: TypeORM genera automáticamente la tabla al iniciar la app
 * (gracias a `synchronize: true` en AppModule)
 */
@Entity('submissions')
export class Submission {
  /**
   * Identificador único, autoincrementado.
   * Se genera automáticamente al insertar un registro.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Identificador del DAG/template asociado.
   * Ejemplo: "informe_ventas", "reporte_usuarios"
   * Longitud máxima: 255 caracteres
   */
  @Column({ type: 'varchar', length: 255 })
  dagId: string;

  /**
   * Datos del formulario en formato JSON.
   * Almacena cualquier tipo de objeto con los valores capturados del formulario.
   * Ejemplo: { "fecha_inicio": "2026-01-01", "region": "Norte", "top_n": 10 }
   */
  @Column({ type: 'json' })
  data: Record<string, any>;

  /**
   * Timestamp de creación.
   * Se asigna automáticamente con la fecha/hora actual cuando se crea el registro.
   * No puede modificarse.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Timestamp de última actualización.
   * Se asigna con la fecha/hora actual al crear y se actualiza en cada modificación.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
