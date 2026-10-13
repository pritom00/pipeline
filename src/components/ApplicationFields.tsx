'use client';

import type { ReactNode } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ApplicationFormValues } from '@/lib/schema';
import { STAGES } from '@/lib/types';

const input = 'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm';

export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export const inputClass = input;

interface Props {
  idPrefix: string;
  register: UseFormRegister<ApplicationFormValues>;
  errors: FieldErrors<ApplicationFormValues>;
  showStage?: boolean;
}

export function ApplicationFields({ idPrefix, register, errors, showStage }: Props) {
  const id = (n: string) => `${idPrefix}-${n}`;
  const bind = (n: keyof ApplicationFormValues) => ({
    id: id(n),
    'aria-invalid': Boolean(errors[n]),
    'aria-describedby': errors[n] ? `${id(n)}-err` : undefined,
    ...register(n),
  });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id={id('company')} label="Company" error={errors.company?.message}>
        <input {...bind('company')} autoComplete="organization" className={input} />
      </Field>
      <Field id={id('role')} label="Role" error={errors.role?.message}>
        <input {...bind('role')} className={input} />
      </Field>
      {showStage && (
        <Field id={id('stage')} label="Stage" error={errors.stage?.message}>
          <select {...bind('stage')} className={input}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field id={id('location')} label="Location" error={errors.location?.message}>
        <input {...bind('location')} placeholder="Remote, Berlin…" className={input} />
      </Field>
      <Field id={id('salary')} label="Salary" error={errors.salary?.message}>
        <input {...bind('salary')} placeholder="$120–150k" className={input} />
      </Field>
      <Field id={id('source')} label="Where you found it" error={errors.source?.message}>
        <input {...bind('source')} placeholder="Referral, job board…" className={input} />
      </Field>
      <div className="sm:col-span-2">
        <Field id={id('url')} label="Link to the posting" error={errors.url?.message}>
          <input {...bind('url')} type="url" inputMode="url" placeholder="https://" className={input} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field id={id('notes')} label="Notes" error={errors.notes?.message}>
          <textarea {...bind('notes')} rows={4} className={`${input} py-2`} />
        </Field>
      </div>
    </div>
  );
}
