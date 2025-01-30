/* eslint-disable perfectionist/sort-classes */
import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs'
import {Octokit} from 'octokit'
import {read} from 'read'
import {simpleGit} from 'simple-git'
import {Score, SizeUp} from 'sizeup-core'

export default class Evaluate extends Command {
  static args = {
    diff: Args.string({
      default: '',
      description: (
        'Options that specify the diff to evaluate. This should be of the form `[url] -- [diff options]`:\n\n'
      + '[url] - To (re-)evaluate the diff of a pull request on GitHub, provide the URL of that pull request here e.g. https://github.com/lerebear/sizeup/pull/1. This can be omitted in order to evaluate a local diff instead.\n\n'
      + '[diff options] - To specify custom options to `git diff` (e.g. --ignore-space-change), specify those options here. These must appear after the literal \'--\', even when the [url] argument is omitted.'
      ),
      required: false,
    }),
  }

  static description = 'Estimate how difficult a diff will be to review'

  static examples = [
    {
      command: '<%= config.bin %>',
      description: 'Use the diff of the modified files in the git working tree',
    },
    {
      command: '<%= config.bin %> -- --merge-base origin/main',
      description: 'Use the diff between the current branch the merge target',
    },
    {
      command: '<%= config.bin %> --config-path experimental.yaml https://github.com/lerebear/sizeup/pull/1 -- --ignore-space-change',
      description: '(Re)compute the score of an existing pull request using both a custom configuration file and custom `git diff` options',
    },
  ]

  static flags = {
    'config-path': Flags.string({
      char: 'c',
      description: 'Path to configuration file for the sizeup lib.\n'
        + 'For more details, see: https://github.com/lerebear/sizeup#configuration',
      required: false,
    }),
    'token-path': Flags.string({
      char: 't',
      description: 'Path to a file containing a GitHub API token.\n'
       + 'If this flag is omitted and the `diff` argument is a URL, then this tool will prompt for a token instead.',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Explain scoring procedure in detail',
      required: false,
    }),
  }

  static strict = false

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Evaluate)
    let score: Score | undefined

    if (args.diff?.startsWith('https://')) {
      score = await this.evaluatePullRequest(flags, args.diff)
    } else if (args.diff) {
      score = await this.evaluateCustomDiff(flags)
    } else {
      score = await this.evaluateWorkingTree(flags)
    }

    if (score) {
      this.log(`Your diff scored ${score.result}${(score.category ? ` (${score.category.name})` : '')}.`)
    }

    if (score && flags.verbose) {
      this.log(`The score was computed as follows:\n${score.toString()}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async evaluatePullRequest(flags: any, url: string): Promise<Score | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_scheme, _blank, _domain, owner, repo, _path, number] = url.split('/')
    const token = await this.fetchToken(flags['token-path'])
    const octokit = new Octokit({auth: token})

    return this.reportProgress(
      `Evaluating the diff from ${url} with the ${this.configChoice(flags)}`,
      async () => {
        try {
          const pull = (
            await octokit.rest.pulls.get({
              owner,
              // eslint-disable-next-line camelcase
              pull_number: Number.parseInt(number, 10),
              repo,
            })
          )

          const diffOptions = (this.argv.join(' ').split(/\s*--\s+/)[1])?.split(/\s+/) || []
          const cloneDirectory = `/tmp/${repo}`

          // Clear the contents of the clone directory,
          // otherwise SizeUp.evaluate will refuse to overwrite them.
          fs.rmSync(cloneDirectory, {force: true, recursive: true})
          fs.mkdirSync(cloneDirectory, {recursive: true})

          return {
            result: SizeUp.evaluate(
              {
                baseRef: pull.data.base.ref,
                cloneDirectory,
                diffOptions,
                headRef: pull.data.head.ref,
                repo: `${owner}/${repo}`,
                token,
              },
              flags['config-path'],
            ),
          }
        } catch (error) {
          return {error: `failed (${((error instanceof Error) ? error.message : '').toLowerCase()})`}
        }
      },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async evaluateCustomDiff(flags: any): Promise<Score | undefined> {
    const git = simpleGit()
    const diffOptions = (this.argv.join(' ').split(/\s*--\s+/)[1])?.split(/\s+/) || []
    const diffDescription = `identified by \`git diff ${diffOptions.join(' ')}\``

    const diff = await this.reportProgress(
      `Retrieving diff ${diffDescription}`,
      async () => ({result: await git.diff(diffOptions)}),
    )

    if (!diff) {
      this.log(`The diff ${diffDescription} was empty.`)
      return
    }

    return this.reportProgress(
      `Evaluating the diff with the ${this.configChoice(flags)}`,
      async () => ({result: await SizeUp.evaluate(diff, flags['config-path'])}),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async evaluateWorkingTree(flags: any): Promise<Score | undefined> {
    const git = simpleGit()

    const diff = await this.reportProgress(
      'Retrieving diff from the working tree',
      async () => ({result: await git.diff()}),
    )

    if (!diff) {
      this.log('The diff of the working tree was empty.')
      return
    }

    return this.reportProgress(
      `Evaluating the diff with the ${this.configChoice(flags)}`,
      async () => ({result: await SizeUp.evaluate(diff, flags['config-path'])}),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async reportProgress(message: string, lambda: () => Promise<{ error?: string, result?: any}>): Promise<any> {
    ux.action.start(message)
    const {error, result} = await lambda()
    ux.action.stop(error)

    return result
  }

  private async fetchToken(path?: string): Promise<string> {
    return path
      ? fs.readFileSync(path).toString().trim()
      : read({prompt: 'Please enter a GitHub API token: ', replace: '*', silent: true})
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private configChoice(flags: any): string {
    return flags['config-path'] ? `config from ${flags['config-path']}` : 'default config'
  }
}
