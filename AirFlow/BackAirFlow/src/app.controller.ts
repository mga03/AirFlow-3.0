import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Controlador simple de ejemplo en la raíz '/'.
 * Proporciona una ruta `GET /` que devuelve un texto de salud.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
