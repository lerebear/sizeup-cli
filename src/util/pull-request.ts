import fetch from 'node-fetch'
import { GITHUB_GRAPHQL_API_URL, PULL_REQUEST_QUERY } from './constants.js'
import { GraphQLRepository } from './types.js'
import { quoteString } from './database.js'

export class PullRequest {
  repository: string
  number: number
  private createdAt: string
  private readyForReviewAt: string
  private closedAt?: string
  private mergedAt?: string
  private approvedAt?: string
  private numCommits = 0
  private numIssueComments = 0
  private numReviews = 0
  private numReviewComments = 0
  private numUnacknowledgedReviewRequests = 0

  static async fetch(repository: string, number: number, token: string): Promise<PullRequest> {
    const [owner, repo] = repository.split('/')
    const response = await fetch(GITHUB_GRAPHQL_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        query: PULL_REQUEST_QUERY,
        variables: {owner, name: repo, number}
      }),
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      }
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.body}`)

    const body = await response.json() as {data: GraphQLRepository}
    if (!body?.data?.repository?.pullRequest) {
      throw new Error(`Unexpected response from GitHub GraphQL API while fetching ${repository}#${number}: ${JSON.stringify(body)}`)
    }

    return new PullRequest(body.data)
  }

  constructor(data: GraphQLRepository) {
    const firstReview = data.repository.pullRequest.reviews.nodes[0]
    const firstApprovingReview = data.repository.pullRequest.reviews.nodes.find((node) => node.state === 'APPROVED')
    const readyForReviewEvent = data.repository.pullRequest.timelineItems.nodes.find((node) => node.__typename === 'ReadyForReviewEvent' && firstReview ? node.createdAt > firstReview.submittedAt : true)

    this.repository = data.repository.nameWithOwner
    this.number = data.repository.pullRequest.number
    this.createdAt = data.repository.pullRequest.createdAt
    this.readyForReviewAt = readyForReviewEvent?.createdAt || data.repository.pullRequest.createdAt
    this.closedAt = data.repository.pullRequest.closed && !data.repository.pullRequest.merged ? data.repository.pullRequest.closedAt : undefined
    this.mergedAt = data.repository.pullRequest.merged ? data.repository.pullRequest.mergedAt : undefined
    this.approvedAt = firstApprovingReview?.submittedAt
    this.numCommits = data.repository.pullRequest.commits.totalCount
    this.numIssueComments = data.repository.pullRequest.comments.totalCount
    this.numReviews = data.repository.pullRequest.reviews.totalCount
    this.numReviewComments =  data.repository.pullRequest.reviews.nodes.reduce((acc, review) => acc + review.comments.totalCount, 0)
    this.numUnacknowledgedReviewRequests = data.repository.pullRequest.reviewRequests.totalCount
  }

  databaseValue(): string {
    const values = [
      quoteString(this.repository),
      this.number,
      quoteString(this.createdAt),
      quoteString(this.readyForReviewAt),
      quoteString(this.closedAt),
      quoteString(this.mergedAt),
      quoteString(this.approvedAt),
      this.numCommits,
      this.numIssueComments,
      this.numReviews,
      this.numReviewComments,
      this.numUnacknowledgedReviewRequests
    ]
    return `(${values.join(', ')})`
  }
}
