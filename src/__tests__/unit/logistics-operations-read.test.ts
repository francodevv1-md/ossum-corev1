import { describe, it, expect } from 'vitest';
import { getSurgeryLogisticsOperations } from '@/lib/services/logistics-operations-read.service';

describe('getSurgeryLogisticsOperations', () => {
  it('executes successfully without error when cajasPhaseD models are undefined on db', async () => {
    const mockDb: any = {
      surgery: {
        findFirst: async () => ({ id: 'surg-1' }),
      },
      cajasAssignment: {
        findMany: async () => [],
      },
      cajasReservationCorrelation: {
        findMany: async () => [],
      },
      cajasDispatchLine: {
        findMany: async () => [],
      },
      cajasDifference: {
        findMany: async () => [],
      },
      remito: {
        findMany: async () => [],
      },
    };

    const result = await getSurgeryLogisticsOperations(mockDb, 'comp-1', 'surg-1', {
      actorUserId: 'user-1',
      role: 'admin',
    });

    expect(result).toBeDefined();
    expect(result.companyId).toBe('comp-1');
    expect(result.surgeryId).toBe('surg-1');
    expect(result.allocations).toEqual([]);
    expect(result.assignments).toEqual([]);
    expect(result.summary.expected).toBe('0');
  });
});
