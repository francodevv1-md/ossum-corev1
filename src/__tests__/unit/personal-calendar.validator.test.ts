import { describe, it, expect } from 'vitest';
import {
  createPersonalCalendarEventSchema,
  updatePersonalCalendarEventSchema,
} from '@/lib/validators/personal-calendar.validator';

describe('personal-calendar.validator', () => {
  describe('createPersonalCalendarEventSchema', () => {
    it('validates valid personal event input', () => {
      const input = {
        title: 'Visitar al Dr. Colman',
        description: 'Reunión sobre instrumental',
        startDate: '2026-10-15T09:00:00.000Z',
        endDate: '2026-10-15T10:00:00.000Z',
      };

      const result = createPersonalCalendarEventSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Visitar al Dr. Colman');
        expect(result.data.description).toBe('Reunión sobre instrumental');
      }
    });

    it('rejects empty title', () => {
      const input = {
        title: '   ',
        startDate: '2026-10-15T09:00:00.000Z',
        endDate: '2026-10-15T10:00:00.000Z',
      };

      const result = createPersonalCalendarEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects endDate before startDate', () => {
      const input = {
        title: 'Visita',
        startDate: '2026-10-15T11:00:00.000Z',
        endDate: '2026-10-15T09:00:00.000Z',
      };

      const result = createPersonalCalendarEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePersonalCalendarEventSchema', () => {
    it('accepts partial update payload', () => {
      const input = {
        title: 'Visitar al Dr. Colman (reprogramado)',
        startDate: '2026-10-16T14:00:00.000Z',
        endDate: '2026-10-16T15:00:00.000Z',
      };

      const result = updatePersonalCalendarEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects update with invalid date sequence', () => {
      const input = {
        startDate: '2026-10-16T16:00:00.000Z',
        endDate: '2026-10-16T14:00:00.000Z',
      };

      const result = updatePersonalCalendarEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
