import { z } from 'zod';

export const createPersonalCalendarEventSchema = z.object({
  title: z.string().trim().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres'),
  description: z.string().trim().max(2000, 'La descripción no puede exceder 2000 caracteres').optional().nullable(),
  startDate: z.string().datetime({ message: 'Fecha de inicio inválida' }).or(z.date()),
  endDate: z.string().datetime({ message: 'Fecha de fin inválida' }).or(z.date()),
}).refine(
  (data) => {
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    return end >= start;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
);

export const updatePersonalCalendarEventSchema = z.object({
  title: z.string().trim().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres').optional(),
  description: z.string().trim().max(2000, 'La descripción no puede exceder 2000 caracteres').optional().nullable(),
  startDate: z.string().datetime({ message: 'Fecha de inicio inválida' }).or(z.date()).optional(),
  endDate: z.string().datetime({ message: 'Fecha de fin inválida' }).or(z.date()).optional(),
  isCancelled: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return end >= start;
    }
    return true;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
);

export type CreatePersonalCalendarEventInput = z.infer<typeof createPersonalCalendarEventSchema>;
export type UpdatePersonalCalendarEventInput = z.infer<typeof updatePersonalCalendarEventSchema>;
