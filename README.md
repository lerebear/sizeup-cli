# SizeUp CLI

Estimate how difficult a diff will be to review using a configurable scoring mechanism.

## Installation

```sh
npm install -g sizeup-cli
```

## Usage

```sh
sizeup --help
```

The output of the above help command looks like this:

```sh
Estimate how difficult a diff will be to review

USAGE
  $ sizeup [DIFF] [-c <value>] [-t <value>] [-v]

ARGUMENTS
  DIFF  Either an arbitrary set of arguments/flags to be forwarded to `git diff` (in which case those arguments must
        appear after "--") OR the URL of a pull request on GitHub (e.g. "https://github.com/lerebear/sizeup/pull/1")

FLAGS
  -c, --config-path=<value>  Path to configuration file for the sizeup lib.
                             For more details, see: https://github.com/lerebear/sizeup#configuration
  -t, --token-path=<value>   Path to a file containing a GitHub API token.
                             If this flag is omitted and the `diff` argument is a URL, then this tool will prompt for a token instead.
  -v, --verbose              Explain scoring procedure in detail

DESCRIPTION
  Estimate how difficult a diff will be to review

EXAMPLES
  Estimate the diff of the modified files in the git working tree

    $ sizeup

  Estimate the diff between the current branch the merge target

    $ sizeup -- --merge-base origin/main

  (Re)compute the score of an existing pull request using a custom configuration file

    $ sizeup --config-path experimental.yaml https://github.com/lerebear/sizeup/pull/1
```
