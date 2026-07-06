import { Pill } from './Pill';
import { useTheme } from '@/hooks/use-theme';

// Canonical status → colour mapping shared by quotes, invoices, and jobs.
export function StatusBadge({ status }: { status: string }) {
  const { colors: c } = useTheme();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft:     { label: 'Draft',     color: c.mutedHi,    bg: c.paperDeep },
    scheduled: { label: 'Scheduled', color: c.orangeDeep, bg: c.orangeSoft },
    pending:   { label: 'Pending',   color: c.orangeDeep, bg: c.orangeSoft },
    sent:      { label: 'Sent',      color: c.blue,       bg: c.blueSoft },
    viewed:    { label: 'Viewed',    color: c.blue,       bg: c.blueSoft },
    accepted:  { label: 'Accepted',  color: c.green,      bg: c.greenSoft },
    invoiced:  { label: 'Invoiced',  color: c.green,      bg: c.greenSoft },
    paid:      { label: 'Paid',      color: c.green,      bg: c.greenSoft },
    partial:   { label: 'Partial',   color: c.orangeDeep, bg: c.orangeSoft },
    completed: { label: 'Completed', color: c.green,      bg: c.greenSoft },
    overdue:   { label: 'Overdue',   color: c.orangeDeep, bg: c.orangeSoft },
    declined:  { label: 'Declined',  color: c.red,        bg: c.redSoft },
    rejected:  { label: 'Declined',  color: c.red,        bg: c.redSoft },
    cancelled: { label: 'Cancelled', color: c.muted,      bg: c.paperDeep },
  };
  const cfg = map[status] ?? map.draft;
  return <Pill label={cfg.label} color={cfg.color} bg={cfg.bg} />;
}
