import type { InspectCurrentSession } from '@sem-caderno/application';

import { assertSessionHmacKey, deriveSessionLookupKey } from './session-credential-lookup.js';
import { mapSessionInspectionToTransport } from './session-inspection-mapper.js';

type InspectCurrentSessionAtServerInput = Readonly<{
  sessionEvidence?: string;
  evaluatedAt: Date;
}>;

type CurrentSessionInspectionCompositionDependencies = Readonly<{
  hmacKey: Uint8Array;
  inspectCurrentSession: InspectCurrentSession;
}>;

export const createCurrentSessionInspectionComposition = (
  dependencies: CurrentSessionInspectionCompositionDependencies,
) => {
  assertSessionHmacKey(dependencies.hmacKey);
  const hmacKey = Uint8Array.from(dependencies.hmacKey);

  return {
    async execute(input: InspectCurrentSessionAtServerInput) {
      const sessionLookup =
        input.sessionEvidence === undefined
          ? undefined
          : deriveSessionLookupKey(input.sessionEvidence, hmacKey);
      const inspection = await dependencies.inspectCurrentSession.execute({
        ...(sessionLookup === undefined ? {} : { sessionLookup }),
        evaluatedAt: input.evaluatedAt,
      });

      return mapSessionInspectionToTransport(inspection);
    },
  };
};
