import {expect, test} from '@oclif/test'

import evaluate from '../../src/commands/evaluate'

describe('evaluate', () => {
  test
  .stderr()
  .stdout()
  .do(() => evaluate.run([]))
  .it('runs evaluate command successfully with no flags or arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff of the working tree was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => evaluate.run(['-v']))
  .it('runs evaluate command successfully with flags but no arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff of the working tree was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => evaluate.run(['--', '--staged']))
  .it('runs evaluate command successfully with arguments but no flags', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff identified by `git diff --staged` was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => evaluate.run(['-v', '--', '--staged']))
  .it('runs evaluate command successfully with flags and arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff identified by `git diff --staged` was empty)/)
  })
})
