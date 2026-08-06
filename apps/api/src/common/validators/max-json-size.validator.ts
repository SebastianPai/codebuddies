import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Ningún campo Json de contenido (lecciones, ejercicios) tenía límite de
// tamaño — se podía guardar un payload arbitrariamente grande sin que nada
// lo impidiera. No reemplaza sanitización HTML (el renderer de markdown del
// frontend no interpreta HTML crudo hoy), pero cierra el vector de abuso más
// directo: alguien escribiendo/guardando contenido de decenas de MB.
export function MaxJsonSize(
  maxBytes: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxJsonSize',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxBytes],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          const [limit] = args.constraints as [number];
          try {
            return Buffer.byteLength(JSON.stringify(value), 'utf8') <= limit;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const [limit] = args.constraints as [number];
          return `${args.property} excede el tamaño máximo permitido (${limit} bytes)`;
        },
      },
    });
  };
}
