'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useDialog } from '@/hooks/useFocusTrap';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applicationFormSchema, type ApplicationFormValues } from '@/lib/schema';
import { useToasts } from '@/store/toast';
import { useUi } from '@/store/ui';
import { ApplicationFields } from './ApplicationFields';
import { Close } from './icons';

export function NewApplicationDialog() {
  const ref = useRef<HTMLDivElement>(null);
  const { newStage, closeNew, open } = useUi();
  const { ws } = useWorkspace();
  const push = useToasts((s) => s.push);
  useDialog(ref, closeNew);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: { company: '', role: '', stage: newStage, url: '', salary: '', location: '', source: '', notes: '' },
  });

  const submit = (v: ApplicationFormValues) => {
    if (!ws) return;
    const id = ws.add(v);
    push({ message: `Added ${v.company}`, actionLabel: 'Open', onAction: () => open(id) });
    closeNew();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && closeNew()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="new-title" className="animate-pop w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-[inset_0_1px_0_var(--edge),0_60px_90px_-30px_var(--shadow)]">
        <div className="mb-5 flex items-center">
          <h2 id="new-title" className="flex-1 text-lg font-semibold">New application</h2>
          <button type="button" aria-label="Close" onClick={closeNew} className="-mr-2 flex size-11 items-center justify-center rounded-lg text-muted"><Close /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-5">
          <ApplicationFields idPrefix="new" register={register} errors={errors} showStage />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeNew} className="min-h-11 rounded-lg border border-line bg-chip px-4 text-sm">Cancel</button>
            <button type="submit" className="bevel-btn min-h-11 rounded-lg px-5 text-sm font-medium">Add application</button>
          </div>
        </form>
      </div>
    </div>
  );
}
