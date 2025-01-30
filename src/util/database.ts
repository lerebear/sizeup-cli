import {Database} from 'duckdb-async'

export async function initializeDatabase(databasePath: string, applySchema: boolean = false): Promise<Database> {
  const database = await Database.create(databasePath)

  if (applySchema) {
    await _applySchema(database)
  }

  return database
}

export function quoteString(str?: string): string {
  return str ? `'${str}'` : 'NULL'
}

async function _applySchema(db: Database): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS sizeup_action_evaluations (
      repository STRING NOT NULL,
      pull_request_number INTEGER NOT NULL,
      pull_request_is_in_draft BOOLEAN NOT NULL,
      pull_request_author_has_opted_in BOOLEAN NOT NULL,
      score FLOAT NOT NULL,
      category STRING,
      evaluated_at DATETIME NOT NULL,
      UNIQUE (repository, pull_request_number, evaluated_at)
    )
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS pull_requests (
      repository STRING NOT NULL,
      number INTEGER NOT NULL,
      created_at DATETIME NOT NULL,
      ready_for_review_at DATETIME,
      closed_at DATETIME,
      merged_at DATETIME,
      approved_at DATETIME,
      num_commits INTEGER NOT NULL DEFAULT 0,
      num_issue_comments INTEGER NOT NULL DEFAULT 0,
      num_reviews INTEGER NOT NULL DEFAULT 0,
      num_review_comments INTEGER NOT NULL DEFAULT 0,
      num_unacknowledged_review_requests INTEGER NOT NULL DEFAULT 0,
      UNIQUE (repository, number)
    )
  `)
}
