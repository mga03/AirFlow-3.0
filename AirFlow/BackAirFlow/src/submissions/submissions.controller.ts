import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';

/**
 * Controlador CRUD para la tabla `submissions` en MySQL.
 * Rutas disponibles:
 * - POST /submissions     -> crear un envío (body: { dagId, data })
 * - GET /submissions      -> listar envíos
 * - GET /submissions/:id  -> obtener un envío por id
 * - PUT /submissions/:id  -> actualizar un envío
 * - DELETE /submissions/:id -> borrar un envío
 */
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Body() body: { dagId: string; data: Record<string, any> }) {
    return this.submissionsService.create(body.dagId, body.data);
  }

  @Get()
  findAll() {
    return this.submissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.submissionsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.remove(id);
  }
}
