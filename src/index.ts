/* eslint-disable perfectionist/sort-classes */
import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs'
import {Octokit} from 'octokit'
import {SimpleGit, simpleGit} from 'simple-git'
import {SizeUp as SizeUpCore} from 'sizeup-core'

interface DiffResult {
  description: string
  diff: string
}

export default class SizeUp extends Command {
  static args = {
    diff: Args.string({
      default: '',
      description: (
        'Either an arbitrary set of arguments/flags to be forwarded to `git diff` (in which case those arguments must\n'
        + 'appear after "--") OR the URL of a pull request on GitHub (e.g. "https://github.com/lerebear/sizeup/pull/1")'
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
      command: '<%= config.bin %> --config-path experimental.yaml https://github.com/lerebear/sizeup/pull/1',
      description: '(Re)compute the score of an existing pull request using a custom configuration file',
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
    const {args, flags} = await this.parse(SizeUp)
    const configChoice = flags['config-path'] ? `config from ${flags['config-path']}` : 'default config'
    const {description, diff} = await this.fetchDiff(args, flags)

    let score
    if (diff) {
      ux.action.start(`Evaluating the diff with the ${configChoice}`)
      score = SizeUpCore.evaluate(diff, flags['config-path'])
      ux.action.stop()
      this.log(`Your diff scored ${score.result}${(score.category ? ` (${score.category.name})` : '')}.`)
    } else {
      this.log(`The diff ${description} was empty.`)
    }

    if (score && flags.verbose) {
      this.log(`The score was computed as follows:\n${score.toString()}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchDiff(args: any, flags: any): Promise<DiffResult> {
    const git = simpleGit()

    if (args.diff?.startsWith('https://')) {
      return this.pullRequestDiff(args.diff, flags['token-path'])
    }

    if (args.diff) {
      return this.customLocalDiff(git)
    }

    return this.defaultLocalDiff(git)
  }

  private async pullRequestDiff(url: string, tokenPath: string): Promise<DiffResult> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_scheme, _blank, _domain, owner, repo, _path, number] = url.split('/')
    const token = tokenPath
      ? fs.readFileSync(tokenPath).toString().trim()
      : await ux.prompt('Please enter a GitHub API token', {type: 'hide'})
    const octokit = new Octokit({auth: token})
    const description = `retrieved from ${url}`
    const diff = await this._diff(`Retrieving diff from ${url}`, async () => {
      let diff: string
      let message: string | undefined

      try {
        const diffWrapper = (
          await octokit.rest.pulls.get({
            mediaType: {format: 'diff'},
            owner,
            // eslint-disable-next-line camelcase
            pull_number: Number.parseInt(number, 10),
            repo,
          })
        )
        diff = diffWrapper.data as unknown as string
        message = undefined
      } catch (error) {
        diff = ''
        message = `failed (${((error instanceof Error) ? error.message : '').toLowerCase()})`
      }

      return {error: message, result: diff}
    })

    return {description, diff}
  }

  private async customLocalDiff(git: SimpleGit): Promise<DiffResult> {
    const diffArgs = this.argv.join(' ').split(/\s*--\s+/)[1].split(/\s+/)
    const description = `identified by \`git diff ${diffArgs.join(' ')}\``
    const diff = await this._diff(`Retrieving diff using ${description}`, async () => ({result: await git.diff(diffArgs)}))

    return {description, diff}
  }

  private async defaultLocalDiff(git: SimpleGit): Promise<DiffResult> {
    const description = 'of the working tree'
    const diff = await this._diff('Retrieving diff from the working tree', async () => ({result: await git.diff()}))

    return {description, diff}
  }

  private async _diff(message: string, lambda: () => Promise<{ error?: string, result: string}>): Promise<string> {
    ux.action.start(message)
    const {error, result} = await lambda()
    ux.action.stop(error)

    return result
  }
}
