import {Args, Command, Flags, ux} from '@oclif/core'
import {simpleGit} from 'simple-git'
import {SizeUp as SizeUpCore} from 'sizeup-core'
import {Octokit} from 'octokit'
import * as fs from 'node:fs'

export default class SizeUp extends Command {
  static strict = false
  static description = 'Estimate how difficult a diff will be to review';

  static examples = [
    {
      description: 'Use the diff of the modified files in the git working tree',
      command: '<%= config.bin %>',
    },
    {
      description: 'Use the diff between the current branch the merge target',
      command: '<%= config.bin %> -- --merge-base origin/main',
    },
    {
      description: '(Re)compute the score of an existing pull request using a custom configuration file',
      command: '<%= config.bin %> --config-path experimental.yaml https://github.com/lerebear/sizeup/pull/1',
    },
  ];

  static flags = {
    'config-path': Flags.string({
      char: 'c',
      description: 'Path to configuration file for the sizeup lib.\n' +
        'For more details, see: https://github.com/lerebear/sizeup#configuration',
      required: false,
    }),
    'token-path': Flags.string({
      char: 't',
      description: 'Path to a file containing a GitHub API token.\n' +
       'If this flag is omitted and the `diff` argument is a URL, then this tool will prompt for a token instead.',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Explain scoring procedure in detail',
      required: false,
    }),
  };

  static args = {
    diff: Args.string({
      description: (
        'Either an arbitrary set of arguments/flags to be forwarded to `git diff` (in which case those arguments must\n' +
        'appear after "--") OR the URL of a pull request on GitHub (e.g. "https://github.com/lerebear/sizeup/pull/1")'
      ),
      required: false,
      default: '',
    }),
  };

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

  private async fetchDiff(args: any, flags: any): Promise<{description: string, diff: string}> {
    const git = simpleGit()

    let description: string
    let diff: string | undefined
    if (!args.diff) {
      ux.action.start('Retrieving diff from the working tree')
      description = 'of the working tree'
      diff = await git.diff()
      ux.action.stop()
    } else if (args.diff.startsWith('https://')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_scheme, _blank, _domain, owner, repo, _path, number] = args.diff.split('/')
      const token = flags['token-path'] ?
        fs.readFileSync(flags['token-path']).toString().trim() :
        await ux.prompt('Please enter a GitHub API token', {type: 'hide'})
      const octokit = new Octokit({auth: token})

      ux.action.start(`Retrieving diff from ${args.diff}`)
      description = `retrieved from ${args.diff}`

      try {
        diff = (
          await octokit.rest.pulls.get({
            owner: owner,
            repo: repo,
            // eslint-disable-next-line camelcase
            pull_number: Number.parseInt(number, 10),
            mediaType: {format: 'diff'},
          })
        ).data as unknown as string
        ux.action.stop()
      } catch (error) {
        diff = ''
        const message = (error instanceof Error) ? error.message : ''
        ux.action.stop(`failed (${message.toLowerCase()})`)
      }
    } else {
      const diffArgs = this.argv.join(' ').split(/\s*--\s+/)[1].split(/\s+/)
      description = `identified by \`git diff ${diffArgs.join(' ')}\``
      ux.action.start(`Retrieving diff using ${description}`)
      diff = await git.diff(diffArgs)
      ux.action.stop()
    }

    return {
      description,
      diff,
    }
  }
}
