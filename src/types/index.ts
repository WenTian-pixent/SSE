export type EventMessage<T = Record<string, unknown>> = {
  event: string;
  data: T;
  id?: string | null;
  userTokens?: string[];
};

export type SampleEventData = {
  sampleField: string;
};
