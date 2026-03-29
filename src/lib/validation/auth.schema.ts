import { z } from 'zod';

export const LoginSchema = z.object({
  email:    z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  role:     z.enum([
    'farmer', 'warehouse', 'lab', 'officer',
    'enterprise', 'consumer', 'secretary', 'admin'
  ]),
});

export type LoginInput = z.infer<typeof LoginSchema>;
