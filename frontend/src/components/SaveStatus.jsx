const LABELS = {
  idle: '',
  pending: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — will retry on next edit',
};

export default function SaveStatus({ status }) {
  const label = LABELS[status];
  if (!label) return null;

  const color =
    status === 'error'
      ? 'text-red-500'
      : status === 'saved'
        ? 'text-green-600 dark:text-green-400'
        : 'text-gray-400';

  return <span className={`text-sm ${color}`}>{label}</span>;
}
