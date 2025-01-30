import { CommonCommandFlags } from "./types.js"

export const DATE_FORMAT = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };

export function getDateRange(flags: CommonCommandFlags): {endDate: Date | undefined, startDate: Date} {
  if (!(flags.lookback || flags['start-date'])) {
    throw new Error('You must select either a lookback period or start and end dates')
  }

  if (flags.lookback && (flags['start-date'] || flags['end-date'])) {
    throw new Error('Use either a lookback period or start and end dates, but not both')
  }

  if (flags['end-date'] && !flags['start-date']) {
    throw new Error('End date must be accompanied by a start date')
  }

  let startDate: Date | undefined
  let endDate: Date | undefined

  if (flags.lookback) {
    startDate = new Date()
    startDate.setDate(startDate.getDate() - getLookbackInDays(flags.lookback))

    endDate = new Date()
    endDate.setDate(endDate.getDate())

    // Remove the time component from each date
    startDate = new Date(startDate.toDateString())
    endDate = new Date(endDate.toDateString())

    return {endDate, startDate}
  }

  startDate = new Date(Date.parse(flags['start-date']!))

  if (!startDate.valueOf()) {
    throw new Error('Start date must be a valid date in YYYY-MM-DD format')
  }

  if (flags['end-date']) {
    endDate = new Date(Date.parse(flags['end-date']))

    if (!endDate.valueOf()) {
      throw new Error('End date must be a valid date in YYYY-MM-DD format')
    }

    if (endDate < startDate) {
      throw new Error('End date must come on or after start date')
    }
  }

  return {endDate, startDate}
}

export function formatDate(date: Date | undefined): string {
  if (!date) return ''

  return date.toISOString().split('T')[0]
}

function getLookbackInDays(lookback: string): number {
  const match = lookback.match(/(?<duration>\d+)(?<unit>d|w|mo|y)/)
  if (!match) throw new Error('Invalid lookback format')

  let lookbackInDays = Number.parseInt(lookback ? match.groups!.duration : '30', 10)

  switch (match.groups!.unit) {
    case 'w': {
      lookbackInDays *= 7
      break
    }

    case 'mo': {
      lookbackInDays *= 30
      break
    }

    case 'y': {
      lookbackInDays *= 365
      break
    }

    default: {
      break
    }
  }

  return lookbackInDays
}
