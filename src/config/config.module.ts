import { Global, Module } from '@nestjs/common';
import { loadConfig } from './configuration';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  // Resolve configuration when Nest constructs the application container,
  // not as a side effect of importing the config barrel. Startup remains
  // fail-closed while isolated unit modules can be imported without env I/O.
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
