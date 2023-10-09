# SizeUp CLI

This repository contains a CLI that wraps the [`sizeup-core` library](https://github.com/lerebear/sizeup-core) in order to provide a way to estimate the reviewability of a local diff.

## Installation

```sh
npm install sizeup-cli
```

## Usage

Run using `npx` e.g.

```sh
npx sizeup --help
```

The output of the above help command looks like this:

```sh
Estimate how difficult a diff will be to review

USAGE
  $ sizeup [DIFF] [-c <value>] [-t <value>] [-v]

ARGUMENTS
  DIFF
      [default: @wip] An identifier for the diff to evalute.

      The following identifiers are supported:

      @wip - special identifier that denotes the modified files in the git working tree (i.e. the result of `git diff`)
      @staged - special identifer that denotes the files in the git staging area (i.e. the result of `git diff --staged`)
      <url> - The URL of a pull request on GitHub (e.g. "https://github.com/lerebear/sizeup-cli/pull/1")

FLAGS
  -c, --config-path=<value>  Path to configuration file for the sizeup lib.
                             For more details, see: https://github.com/lerebear/sizeup-core#configuration
  -t, --token-path=<value>   Path to a file containing a GitHub API token.
                             If this flag is omitted and the `diff` argument is a URL, then this tool will prompt for a token instead.
  -v, --verbose              Explain scoring procedure in detail

DESCRIPTION
  Estimate how difficult a diff will be to review

EXAMPLES
  Estimate the reviewability of the diff of the modified files in the git working tree

    $ sizeup @wip

  Estimate the reviewability of the diff of the staged files in the git index using a custom configuration file

    $ sizeup @staged  --config-path experimental.yaml

  (Re)compute the reviewability of the diff from an existing pull request

    $ sizeup https://github.com/lerebear/sizeup-cli/pull/1
```
