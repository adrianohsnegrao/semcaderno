export type SessionLookupKey = Readonly<{
  digestVersion: 1;
  digestBase64Url: string;
}>;

export type InspectCurrentSessionInput = Readonly<{
  sessionLookup?: SessionLookupKey;
  evaluatedAt: Date;
}>;

export type ResolveSessionInput = Readonly<{
  sessionLookup: SessionLookupKey;
  evaluatedAt: Date;
}>;

export type AnonymousSessionInspection = Readonly<{
  state: 'anonymous';
}>;

export type AuthenticatedSessionInspection = Readonly<{
  state: 'authenticated';
  userId: string;
  expiresAt: Date;
  selectedBusinessId?: string;
}>;

export type SessionInspection = AnonymousSessionInspection | AuthenticatedSessionInspection;

export interface SessionResolutionPort {
  resolve(input: ResolveSessionInput): Promise<AuthenticatedSessionInspection | undefined>;
}

export interface InspectCurrentSession {
  execute(input: InspectCurrentSessionInput): Promise<SessionInspection>;
}

const anonymousSession: AnonymousSessionInspection = Object.freeze({ state: 'anonymous' });

export const createInspectCurrentSession = (
  sessionResolution: SessionResolutionPort,
): InspectCurrentSession => ({
  async execute(input) {
    if (input.sessionLookup === undefined) {
      return anonymousSession;
    }

    const session = await sessionResolution.resolve({
      sessionLookup: input.sessionLookup,
      evaluatedAt: input.evaluatedAt,
    });

    return session ?? anonymousSession;
  },
});
