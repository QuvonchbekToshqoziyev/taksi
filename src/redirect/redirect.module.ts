import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RedirectService],
  exports:[RedirectService]

})
export class RedirectModule {}
