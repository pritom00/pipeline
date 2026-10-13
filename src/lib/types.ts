export const STAGES = [
  { id: 'wishlist', name: 'Wishlist', color: '#8A8A94' },
  { id: 'applied', name: 'Applied', color: '#3B82F6' },
  { id: 'screening', name: 'Screening', color: '#D99A1E' },
  { id: 'interview', name: 'Interview', color: '#8B5CF6' },
  { id: 'offer', name: 'Offer', color: '#2FA36B' },
  { id: 'rejected', name: 'Rejected', color: '#E5484D' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export const STAGE_IDS = STAGES.map((s) => s.id) as StageId[];

export const stageById = (id: StageId) => STAGES.find((s) => s.id === id)!;

export interface TimelineEvent {
  id: string;
  type: 'stage_changed' | 'note';
  at: string; // ISO timestamp
  stage?: StageId;
  text?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface Reminder {
  id: string;
  text: string;
  dueAt: string; // ISO date
  done: boolean;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  stage: StageId;
  /** Fractional index. Sorts lexicographically within a stage. */
  position: string;
  salary: string;
  location: string;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  events: TimelineEvent[];
  contacts: Contact[];
  reminders: Reminder[];
}

export type ApplicationInput = {
  company: string;
  role: string;
  stage?: StageId;
  url?: string;
  salary?: string;
  location?: string;
  source?: string;
  notes?: string;
};

export const EDITABLE_FIELDS = ['company', 'role', 'url', 'salary', 'location', 'source', 'notes'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type ApplicationPatch = Partial<Pick<Application, EditableField>>;
