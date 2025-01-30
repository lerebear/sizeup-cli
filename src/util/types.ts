export type Format = 'csv' | 'json'

export interface ArchiveCommandArgs {
  repository: string
}

export interface ArchiveCommandFlags extends CommonCommandFlags {
  format: Format
  clean: boolean
  "token-path"?: string
}

export interface ReportCommandFlags extends CommonCommandFlags {}

export interface CommonCommandFlags {
  "database-path": string
  lookback?: string
  "start-date"?: string
  "end-date"?: string
}

export interface Artifact {
  id: number,
  created_at: string | null
}

export interface GraphQLRepository {
  repository: {
    nameWithOwner: string
    pullRequest: GraphQLPullRequest
  }
}

export interface DatabaseQueryOptions {
  repository: string,
  startDate: Date,
  endDate?: Date,
  primaryDimensionAlias?: string,
  additionalDimensions?: string[],
  filters?: string[]
}

interface GraphQLPullRequest {
  author: GraphQLUser
  number: number
  createdAt: string
  closed: boolean
  closedAt: string
  merged: boolean
  mergedAt: string
  commits: GraphQLTotalCount
  comments: GraphQLTotalCount
  reviews: GraphQLReviews
  reviewRequests: GraphQLReviewRequests
  timelineItems: GraphQLTimelineItems
}

interface GraphQLReviews extends GraphQLTotalCount, GraphQLPagination {
  nodes: {
    submittedAt: string
    state: string
    author: GraphQLUser
    comments: GraphQLTotalCount
  }[]
}

interface GraphQLReviewRequests extends GraphQLTotalCount, GraphQLPagination {
  nodes: {
    requestedReviewer: GraphQLUser | GraphQLTeam
  }[]
}

interface GraphQLTimelineItems extends GraphQLPagination {
  nodes: GraphQLReadyForReviewEvent[]
}

interface GraphQLReadyForReviewEvent {
  createdAt: string
  __typename: string
}

interface GraphQLUser {
  login: string
  __typename?: string
}

interface GraphQLTeam {
  name: string
  __typename: string
}

interface GraphQLTotalCount {
  totalCount: number
}

interface GraphQLPagination {
  pageInfo: {
    hasNextPage: boolean
    endCursor: string
  }
}
