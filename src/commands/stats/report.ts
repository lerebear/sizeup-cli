import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import { TMP_DIR } from '../../util/constants.js'
import { getDateRange } from '../../util/dates.js'
import { quoteString } from '../../util/database.js'
import { execSync } from 'node:child_process'
import { DatabaseQueryOptions } from '../../util/types.js'

// BREADCRUMB:
//    1. Remove dep on duckdb binary

// TODO(lerebear): Make an actual export
// COPY (SELECT last_value(score) OVER (PARTITION BY pull_request_number ORDER BY evaluated_at), last_value(category) OVER (PARTITION BY pull_request_number ORDER BY evaluated_at), number, merged_at, num_commits, num_issue_comments, num_reviews, num_review_comments, num_unacknowledged_review_requests FROM sizeup_action_evaluations INNER JOIN pull_requests ON sizeup_action_evaluations.pull_request_number = pull_requests.number WHERE sizeup_action_evaluations.score > 0 AND pull_requests.ready_for_review_at IS NOT NULL AND pull_requests.merged_at IS NOT NULL) TO '~/DATA/sizeup-2025-01-01-to-2025-03-04-condensed.csv' (HEADER, DELIMITER ',');

export default class Report extends Command {
  static args = {
    repository: Args.string({
      description: 'The repository whose data we should report on e.g. lerebear/sous',
      required: true,
    })
  }

  static description = 'Report on the `sizeup-action` data stored in the given DuckDB database'

  static examples = [
    {
      command: '<%= config.bin %> stats:report',
      description: "Report on the last month's worth of `sizeup-action` data stored in the DuckDB database at /tmp/sizeup/data.duckdb"
    },
    {
      command: '<%= config.bin %> stats:report -s 2024-10-01 -e 2024-10-08 -d ./sizeup.duckdb',
      description: "Report on the `sizeup-action` data from October 1 to October 8, 2024 that is stored in the DuckDB database at ./sizeup.duckdb"
    },
  ]

  static flags = {
    // eslint-disable-next-line perfectionist/sort-objects
    'database-path': Flags.string({
      char: 'd',
      default: path.resolve(TMP_DIR, './data.duckdb'),
      description: 'Path to the DuckDB database containing the data to report on e.g. "/tmp/data.duckdb"',
      required: false,
    }),
    lookback: Flags.string({
      char: 'l',
      description: (
        'The lookback period over which to report on data e.g. "4d", "10w", "3mo". This is an alternative to setting an explicit start and end date.'
      ),
      required: false,
    }),
    'start-date': Flags.string({
      char: 's',
      description: (
        'The start date (inclusive) from which to begin reporting in YYYY-MM-DD format e.g. "2023-01-01"'
      ),
      required: false,
    }),
    // eslint-disable-next-line perfectionist/sort-objects
    'end-date': Flags.string({
      char: 'e',
      description: (
        'The end date (exclusive) at which to stop reporting in YYYY-MM-DD format e.g. "2023-01-08". This must be greater than or equal to the start date.'
      ),
      required: false,
    }),
    'stat-type': Flags.string({
      char: 't',
      description: 'The type of statistics to report on',
      options: ["review-engagement", "delivery", "effectiveness", "all"],
      default: "all",
      required: false,
    }),
  }

  static strict = false

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Report)
    const {startDate, endDate} = getDateRange(flags)

    if (execSync('which uplot').toString().trim() === '') {
      this.error('This command requires the uplot executable. Please follow the instructions at https://github.com/red-data-tools/YouPlot#installation to install it.')
    }

    switch (flags['stat-type']) {
      case "review-engagement":
        this.reportReviewEngagement(args.repository, flags['database-path'], startDate, endDate)
        break
      case "delivery":
        this.reportDelivery(args.repository, flags['database-path'], startDate, endDate)
        break
      case "effectiveness":
        this.reportEffectiveness(args.repository, flags['database-path'], startDate, endDate)
        break
      case "all":
        this.reportReviewEngagement(args.repository, flags['database-path'], startDate, endDate)
        this.reportDelivery(args.repository, flags['database-path'], startDate, endDate)
        this.reportEffectiveness(args.repository, flags['database-path'], startDate, endDate)
        break
    }
  }

  /**
   * Provides data to answer the question: "Is there a relationship between diff size and review engagement?"
   *
   * The specific data reported consists of three scatter plots:
   *   1. Number of comments on pull requests vs. diff size (as measured by the sizeup score)
   *   2. Number of reviews on pull requests vs. diff size
   *   3. Number of unacknowledged review requests on pull requests vs. diff size
   *
   *
   * @param databasePath Path to the DuckDB database containing the `sizeup-action` data
   * @param startDate Inclusive date of the first data point to include in the report
   * @param endDate Exclusive date of the first data point to exclude in the report
   */
  private reportReviewEngagement(repository: string, databasePath: string, startDate: Date, endDate?: Date): void {
    this.scatterPlot(
      ["(num_issue_comments + num_review_comments) AS 'number of comments'"],
      'comments vs. diff size',
      repository,
      databasePath,
      startDate,
      endDate
    )

    this.scatterPlot(
      ["num_reviews AS 'number of reviews'"],
      'reviews vs. diff size',
      repository,
      databasePath,
      startDate,
      endDate
    )

    this.scatterPlot(
      ["num_unacknowledged_review_requests AS 'number of unacknowledged review requests'"],
      'unacknowledged reviews vs. diff size',
      repository,
      databasePath,
      startDate,
      endDate
    )
  }

  // - [ ] Is there a relationship between diff size and delivery?
  //     - [ ] Diff size v. Time to approval scatter
  //     - [ ] Diff size v. Time to merge scatter
  private reportDelivery(repository: string, databasePath: string, startDate: Date, endDate?: Date): void {
    this.scatterPlot(
      ["(approved_at - ready_for_review_at) AS 'time to approval (days)'"],
      'time to approval vs. diff size',
      repository,
      databasePath,
      startDate,
      endDate
    )

    this.scatterPlot(
      ["(merged_at - ready_for_review_at) AS 'time to merge (days)'"],
      'time to merge vs. diff size',
      repository,
      databasePath,
      startDate,
      endDate
    )
  }

  // - [ ] Does our tool affect diff size?
  //     - [ ] Diff size histogram
  //     - [ ] Diff size by adoption box plot
  private reportEffectiveness(repository: string, databasePath: string, startDate: Date, endDate?: Date): void {
    const histogramQuery = this.databaseQuery({repository, startDate, endDate})
    this.plot(
      `duckdb ${databasePath} -readonly -s "COPY (${histogramQuery}) TO '/dev/stdout' WITH (FORMAT 'csv', HEADER)" \
        | uplot histogram -t "diff size distribution" --output - --nbins 7 --color-output --headers
      `
    )

    const participatingQuery = this.databaseQuery({
      repository,
      startDate,
      endDate,
      filters: ["pull_request_author_has_opted_in = true"],
      primaryDimensionAlias: "__participating__"
    })
    this.plot(
      `duckdb ${databasePath} -readonly -s "COPY (${participatingQuery}) TO '/dev/stdout' WITH (FORMAT 'csv', HEADER)" \
        | uplot boxplot -t "diff size for sizeup-action participants" --output - --color-output --headers
      `
    )

    const nonParticipatingQuery = this.databaseQuery({
      repository,
      startDate,
      endDate,
      filters: ["pull_request_author_has_opted_in = false"],
      primaryDimensionAlias: "not participating"
    })
    this.plot(
      `duckdb ${databasePath} -readonly -s "COPY (${nonParticipatingQuery}) TO '/dev/stdout' WITH (FORMAT 'csv', HEADER)" \
        | uplot boxplot -t "diff size for sizeup-action non-participants" --output - --color-output --headers
      `
    )
  }

  private scatterPlot(dimensions: string[], title: string, repository: string, databasePath: string, startDate: Date, endDate?: Date): void {
    const query = this.databaseQuery({
      repository,
      startDate,
      endDate,
      additionalDimensions: dimensions
    })
    this.plot(
      `duckdb ${databasePath} -readonly -s "COPY (${query}) TO '/dev/stdout' WITH (FORMAT 'csv', HEADER)" \
        | uplot scatter --title "${title}" --delimiter "," --color-output --headers
      `
    )
  }

  private databaseQuery(options: DatabaseQueryOptions): string {
    return this.condense(`
      SELECT
        last_value(score) OVER (PARTITION BY pull_request_number ORDER BY evaluated_at) AS '${options.primaryDimensionAlias ?? 'sizeup score'}'
        ${options.additionalDimensions ? ', ' + options.additionalDimensions.join(',\n') : ''},
      FROM
        sizeup_action_evaluations
      INNER JOIN
        pull_requests
      ON
        sizeup_action_evaluations.pull_request_number = pull_requests.number
      AND
        sizeup_action_evaluations.repository = pull_requests.repository
      WHERE
        sizeup_action_evaluations.repository = '${options.repository}' AND
        sizeup_action_evaluations.score > 0 AND
        pull_requests.ready_for_review_at IS NOT NULL AND
        pull_requests.merged_at IS NOT NULL AND
        ${this.evaluatedAtFilter(options.startDate, options.endDate)}
        ${options.filters ? 'AND ' + options.filters.join(' AND\n') : ''}
    `)
  }

  private evaluatedAtFilter(startDate: Date, endDate?: Date): string {
    return `
        evaluated_at >= ${quoteString(startDate.toISOString())}
        ${endDate ? `AND evaluated_at < ${quoteString(endDate.toISOString())}` : ''}
    `.trimStart()
  }

  private condense(query: string): string {
    return query.trim().replace(/\s+/g, ' ')
  }

  private plot(command: string): void {
    const stdout = execSync(command)
    console.log(stdout.toString())
  }
}

