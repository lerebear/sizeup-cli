import {Args, Command, Flags, ux} from '@oclif/core'
import {simpleGit} from 'simple-git'
import {SizeUp as SizeUpCore} from 'sizeup-core'
import {Octokit} from 'octokit'
import * as fs from 'node:fs'

export default class SizeUp extends Command {
  static description = 'Estimate how difficult a diff will be to review';

  static examples = [
    {
      description: 'Estimate the reviewability of the diff of the modified files in the git working tree',
      command: '<%= config.bin %> @wip',
    },
    {
      description: 'Estimate the reviewability of the diff of the staged files in the git index using a custom configuration file',
      command: '<%= config.bin %> @staged  --config-path experimental.yaml',
    },
    {
      description: '(Re)compute the reviewability of the diff from an existing pull request',
      command: '<%= config.bin %> https://github.com/lerebear/sizeup/pull/1',
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
      description: 'An identifier for the diff to evalute.\n\n' +
        'The following identifiers are supported:\n\n' +
        '  @wip - special identifier that denotes the modified files in the git working tree (i.e. the result of `git diff`)\n' +
        '  @staged - special identifer that denotes the files in the git staging area (i.e. the result of `git diff --staged`)\n' +
        '  <url> - The URL of a pull request on GitHub (e.g. "https://github.com/lerebear/sizeup/pull/1")',
      required: false,
      default: '@wip',
    }),
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(SizeUp)

    const git = simpleGit()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_scheme, _blank, _domain, owner, repo, _path, number] = args.diff.split('/')
    let octokit: Octokit | undefined
    let token: string | undefined
    let diff: string | undefined

    switch (args.diff) {
    case '@wip':
      ux.action.start('Retrieving diff from the working tree')
      diff = await git.diff()
      ux.action.stop()
      break
    case '@stage':
    case '@staged':
    case '@cache':
    case '@cached':
      ux.action.start('Retrieving diff from the staging area')
      diff = await git.diff(['--staged'])
      ux.action.stop()
      break
    default:
      token = flags['token-path'] ?
        fs.readFileSync(flags['token-path']).toString().trim() :
        await ux.prompt('Please enter a GitHub API token', {type: 'hide'})
      octokit = new Octokit({auth: token})
      try {
        ux.action.start(`Retrieving diff from ${args.diff}`)
        diff = (
          await octokit.rest.pulls.get({
            owner: owner,
            repo: repo,
            // eslint-disable-next-line camelcase
            pull_number: Number.parseInt(number, 10),
            mediaType: {format: 'diff'},
          })
        ).data as unknown as string
      } catch (error) {
        const message = (error instanceof Error) ? error.message : ''
        ux.action.stop(`failed (${message.toLowerCase()})`)
        return
      }

      ux.action.stop()
      break
    }

    if (diff) {
      ux.action.start(`Evaluating the diff with the ${flags['config-path'] ? `config from ${flags['config-path']}` : 'default config'}`)
      const score = SizeUpCore.evaluate(diff!, flags['config-path'])
      ux.action.stop()
      this.log(`Your diff scored ${score.result}${(score.category ? ` (${score.category.name})` : '')}.`)

      if (flags.verbose) {
        this.log(`The score was computed as follows:\n${score.toString()}`)
      }
    } else {
      this.log(`The diff identified by '${args.diff}' was empty.`)
    }
  }
}
