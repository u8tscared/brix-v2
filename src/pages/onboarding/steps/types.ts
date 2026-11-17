import type { Draft } from '@/pages/onboarding/draft';

export interface StepProps {
  d: Draft;
  set: (p: Partial<Draft>) => void;
}
