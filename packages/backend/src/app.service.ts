import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello() {
    const usuarios = await this.prisma.usuario.count();
    return { mensaje: 'Backend conectado', usuarios };
  }
}
