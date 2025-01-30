export const TMP_DIR = '/tmp/sizeup'
export const ARTIFACT_API_CONCURRENCY_LIMIT = 20
export const GRAPHQL_API_CONCURRENCY_LIMIT = 20
export const GITHUB_GRAPHQL_API_URL = "https://api.github.com/graphql"

export const PULL_REQUEST_QUERY = `
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner:$owner, name:$name) {
      nameWithOwner
      pullRequest(number: $number) {
        author {
          login
        }
        number
        createdAt
        closed
        closedAt
        merged
        mergedAt
        commits {
          totalCount
        }
        comments {
          totalCount
        }
        reviews(first: 100) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            state
            submittedAt
            author {
              login
            }
            comments {
              totalCount
            }
          }
        }
        reviewRequests(first: 100) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            requestedReviewer {
              ... on User {
                __typename
                login
              }
              ... on Team {
                __typename
                name
              }
            }
          }
        }
        timelineItems(first: 100, itemTypes: [READY_FOR_REVIEW_EVENT, PULL_REQUEST_REVIEW]) {
          nodes {
            ...on ReadyForReviewEvent {
              __typename
              createdAt
            }
          }
        }
      }
    }
  }
`
