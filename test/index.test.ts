import {expect, test} from '@oclif/test'

import sizeup from '../src'

describe('sizeup', () => {
  test
  .stderr()
  .stdout()
  .do(() => sizeup.run([]))
  .it('runs sizeup command successfully with no flags or arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff of the working tree was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => sizeup.run(['-v']))
  .it('runs sizeup command successfully with flags but no arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff of the working tree was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => sizeup.run(['--', '--staged']))
  .it('runs sizeup command successfully with arguments but no flags', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff identified by `git diff --staged` was empty)/)
  })

  test
  .stderr()
  .stdout()
  .do(() => sizeup.run(['-v', '--', '--staged']))
  .it('runs sizeup command successfully with flags and arguments', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff identified by `git diff --staged` was empty)/)
  })
})
