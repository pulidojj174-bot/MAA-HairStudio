import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ AGREGAR: Configuración global para @Exclude()
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'exposeAll',
      excludeExtraneousValues: false,
    })
  );
  // Seguridad
  app.use(helmet());

  // Habilitar CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1'); // Prefijo global para todas las rutas, ej: /api/v1/auth/login

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma el payload a instancias del DTO
      transformOptions: {
        enableImplicitConversion: true, // Permite conversión implícita de tipos
      },
    }),
  );
  app.enableCors(); // Habilita CORS para todas las rutas
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
