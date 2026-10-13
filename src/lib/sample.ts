import { generateNKeysBetween } from 'fractional-indexing';
import { newId } from './id';
import { STAGE_IDS, type Application, type StageId, type TimelineEvent } from './types';

const DAY = 86_400_000;

type Seed = {
  company: string;
  role: string;
  location: string;
  salary: string;
  source: string;
  /** [stage, daysAgo] in order; the last entry is the current stage. */
  path: [StageId, number][];
};

const SEEDS: Seed[] = [
  { company: 'Cartograph', role: 'Frontend Engineer', location: 'Remote', salary: '$120–150k', source: 'Company site', path: [['wishlist', 2]] },
  { company: 'Fieldnote', role: 'Product Engineer', location: 'Berlin', salary: '€70–90k', source: 'Job board', path: [['wishlist', 5]] },
  { company: 'Northwind Labs', role: 'Software Engineer', location: 'Remote', salary: '$110–140k', source: 'Job board', path: [['applied', 9]] },
  { company: 'Brightloop', role: 'UI Engineer', location: 'London', salary: '£65–80k', source: 'Recruiter', path: [['applied', 3]] },
  { company: 'Halcyon Health', role: 'Full-stack Engineer', location: 'Remote', salary: '$100–130k', source: 'Company site', path: [['applied', 12]] },
  { company: 'Tidewater', role: 'Frontend Engineer', location: 'Toronto', salary: 'CA$100–125k', source: 'Referral', path: [['applied', 8], ['screening', 1]] },
  { company: 'Lumen Works', role: 'Senior Frontend Engineer', location: 'Remote', salary: '$140–170k', source: 'Referral', path: [['applied', 22], ['screening', 14], ['interview', 1]] },
  { company: 'Parcelo', role: 'Software Engineer', location: 'Amsterdam', salary: '€75–95k', source: 'Job board', path: [['applied', 18], ['screening', 11], ['interview', 4]] },
  { company: 'Oakridge', role: 'Frontend Engineer', location: 'Remote', salary: '$135k', source: 'Referral', path: [['applied', 35], ['screening', 28], ['interview', 17], ['offer', 2]] },
  { company: 'Granite Systems', role: 'Web Engineer', location: 'Dublin', salary: '€80k', source: 'Job board', path: [['applied', 30], ['rejected', 21]] },
];

export function sampleApplications(now: Date = new Date()): Application[] {
  const apps = SEEDS.map((s): Application => {
    const at = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
    const events: TimelineEvent[] = s.path.map(([stage, d]) => ({ id: newId(), type: 'stage_changed', at: at(d), stage }));
    const last = s.path[s.path.length - 1]!;
    return {
      id: newId(),
      company: s.company,
      role: s.role,
      url: '',
      stage: last[0],
      position: '',
      salary: s.salary,
      location: s.location,
      source: s.source,
      notes: '',
      createdAt: at(s.path[0]![1]),
      updatedAt: at(last[1]),
      archived: false,
      events,
      contacts: [],
      reminders: [],
    };
  });
  for (const stage of STAGE_IDS) {
    const inStage = apps.filter((a) => a.stage === stage);
    const keys = generateNKeysBetween(null, null, inStage.length);
    inStage.forEach((a, i) => (a.position = keys[i]!));
  }
  return apps;
}
