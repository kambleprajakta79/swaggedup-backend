import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsImageDataUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isImageDataUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Matches standard base64 data URLs for png, jpeg/jpg, webp
          const regex = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
          if (!regex.test(value)) return false;
          
          // Extract base64 content to check payload size
          const parts = value.split(',');
          if (parts.length !== 2) return false;
          const base64Data = parts[1];
          
          // Calculate byte size (Base64 is ~4/3 the size of binary)
          const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
          const byteLength = (base64Data.length * 3) / 4 - padding;
          
          // Maximum size for optimized Base64 image (10MB maximum limit)
          const maxBytes = 10 * 1024 * 1024; 
          return byteLength <= maxBytes;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid image Data URL (JPEG, PNG, WEBP) and under 10MB`;
        }
      },
    });
  };
}
