import { z } from 'zod';
import { STAGE_IDS, type StageId } from './types';

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);
const stage = z.enum(STAGE_IDS as [StageId, ...StageId[]]);

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export const applicationFormSchema = z.object({
  company: text(80).min(1, 'Enter a company name'),
  role: text(120).min(1, 'Enter a role'),
  stage,
  url: text(500).refine((v) => v === '' || isHttpUrl(v), 'Enter a full link, starting with https://'),
  salary: text(60),
  location: text(80),
  source: text(80),
  notes: text(5000),
});
export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export const contactFormSchema = z.object({
  name: text(80).min(1, 'Enter a name'),
  role: text(80),
  email: text(120).refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email address'),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const reminderFormSchema = z.object({
  text: text(200).min(1, 'Enter what to follow up on'),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
});
export type ReminderFormValues = z.infer<typeof reminderFormSchema>;

// ---- import / export file ----

const eventSchema = z.object({
  id: z.string(),
  type: z.enum(['stage_changed', 'note']),
  at: z.string(),
  stage: stage.optional(),
  text: z.string().optional(),
});

const applicationSchema = z.object({
  id: z.string().min(1),
  company: z.string(),
  role: z.string(),
  url: z.string().default(''),
  stage,
  position: z.string().min(1),
  salary: z.string().default(''),
  location: z.string().default(''),
  source: z.string().default(''),
  notes: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean().default(false),
  events: z.array(eventSchema).default([]),
  contacts: z
    .array(z.object({ id: z.string(), name: z.string(), role: z.string().default(''), email: z.string().default('') }))
    .default([]),
  reminders: z
    .array(z.object({ id: z.string(), text: z.string(), dueAt: z.string(), done: z.boolean().default(false) }))
    .default([]),
});

export const exportFileSchema = z.object({
  app: z.literal('pipeline'),
  version: z.literal(1),
  exportedAt: z.string(),
  applications: z.array(applicationSchema),
});
export type ExportFile = z.infer<typeof exportFileSchema>;

