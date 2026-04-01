import { RecordStatusFilter } from '@provablehq/aleo-wallet-standard';

type NormalizedRecordStatus = Exclude<RecordStatusFilter, 'all'> | 'pending';

function getNormalizedRecordStatus(record: unknown): NormalizedRecordStatus | undefined {
  if (!record || typeof record !== 'object') {
    return undefined;
  }

  const recordValue = record as Record<string, unknown>;

  if (typeof recordValue.spent === 'boolean') {
    return recordValue.spent ? 'spent' : 'unspent';
  }

  if (typeof recordValue.status !== 'string') {
    return undefined;
  }

  switch (recordValue.status.toLowerCase()) {
    case 'spent':
      return 'spent';
    case 'unspent':
      return 'unspent';
    case 'pending':
      return 'pending';
    default:
      return undefined;
  }
}

export function filterRecordsByStatus(
  records: unknown[],
  statusFilter: RecordStatusFilter = 'all',
): unknown[] {
  if (statusFilter === 'all') {
    return records;
  }

  return records.filter(record => getNormalizedRecordStatus(record) === statusFilter);
}
