import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DagsModule } from './dags/dags.module';
import { TemplatesModule } from './templates/templates.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ExecutionsModule } from './executions/executions.module';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * AppModule
 *
 * Módulo raíz de la aplicación.
 *
 * **Responsabilidades**:
 * - Configurar conexión a bases de datos (MySQL)
 * - Importar módulos principales de la aplicación
 * - Registrar dependencias globales (HttpModule)
 *
 * **Módulos registrados**:
 * - HttpModule: Para comunicaciones HTTP con Airflow
 * - TypeOrmModule: Configuración de MySQL
 * - DagsModule: Integración con Airflow (listar, disparar, sincronizar DAGs)
 * - TemplatesModule: Gestión de templates en CouchDB
 * - SubmissionsModule: Gestión de submissions (DEPRECATED: mantener para compatibilidad)
 * - ExecutionsModule: Gestión completa de ejecuciones (NUEVO: reemplaza Submissions)
 *
 * **Configuración MySQL**:
 * - Host: localhost:3306
 * - Database: airflow
 * - autoLoadEntities: true (TypeORM auto-descubre entidades)
 * - synchronize: true (auto-crea tablas y columnas)
 *
 * **Flujo de la aplicación**:
 * 1. main.ts → bootstrap() → NestFactory.create(AppModule)
 * 2. AppModule carga todos los imports
 * 3. TypeOrmModule inicializa conexión MySQL
 * 4. HttpModule disponible globalmente
 * 5. Módulos registran sus controllers y providers
 * 6. Aplicación lista en puerto 3000
 *
 * **IMPORTANTE**:
 * - Executions es el nuevo modelo (reemplaza Submissions)
 * - Submissions se mantiene por compatibilidad con cliente anterior
 * - Las nuevas ejecuciones deben usar ExecutionsModule
 */
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'password',
      database: process.env.MYSQL_DATABASE || 'airflow',
      autoLoadEntities: true,
      synchronize: true,
    }),
    DagsModule,
    TemplatesModule,
    SubmissionsModule,
    ExecutionsModule, // ← NUEVO: Gestión completa de ejecuciones
  ],
})
export class AppModule {}
