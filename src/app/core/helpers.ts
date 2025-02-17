import moment from 'moment';

export function formatDateWithMoment(
  date: string | null,
  options: { formats?: Array<string>; useFormat?: string; defaultValue?: string } = {},
): string {
  const {
    formats = ['YYYY-MM-DDTHH:mm:ss'],
    useFormat = 'YYYY. MM. DD. HH:mm:ss',
    defaultValue = '',
  } = options;

  if (!date) {
    return defaultValue;
  }

  const dateMoment = moment(date, formats);

  if (dateMoment.isValid()) {
    return dateMoment.format(useFormat);
  }

  return defaultValue;
}
