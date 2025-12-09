import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginUserDto {
  @IsEmail(
    {},
    {
      message:
        'Por favor, proporciona una dirección de correo electrónico válida.',
    },
  )
  @IsNotEmpty({ message: 'El correo electrónico no debe estar vacío.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña no debe estar vacía.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
  })
  password: string;
}
