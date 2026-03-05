import { Injectable } from '@nestjs/common';

/**
 * Servicio de ejemplo que normalmente contendría lógica de negocio.
 * Aquí solo devuelve un string para comprobar que la app está viva.
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
