import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [RedirectService,PrismaService],
  exports:[RedirectService]

})
export class RedirectModule {}
