import { Module } from '@nestjs/common';
import { UserClientService } from './user-client.service';
import { KeywordModule } from '../keyword/keyword.module';
import { RedirectModule } from '../redirect/redirect.module';
import { TargetModule } from '../target/target.module';

@Module({
  imports: [KeywordModule, RedirectModule, TargetModule],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}
