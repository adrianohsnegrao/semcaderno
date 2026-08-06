import type { SessionInspection } from '@sem-caderno/application';
import type { CurrentSessionInspectionResponse } from '@sem-caderno/contracts';

export const mapSessionInspectionToTransport = (
  inspection: SessionInspection,
): CurrentSessionInspectionResponse => {
  if (inspection.state === 'anonymous') {
    return { data: { state: 'anonymous' } };
  }

  return {
    data: {
      state: 'authenticated',
      userId: inspection.userId,
      expiresAt: inspection.expiresAt.toISOString(),
      ...(inspection.selectedBusinessId === undefined
        ? {}
        : { selectedBusiness: { businessId: inspection.selectedBusinessId } }),
    },
  };
};
