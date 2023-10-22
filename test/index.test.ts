import {expect, test} from '@oclif/test'
import sizeup from '../src'

describe('sizeup', () => {
  test
  .stderr()
  .stdout()
  .do(() => sizeup.run([]))
  .it('runs sizeup cmd', ctx => {
    expect(ctx.error).to.be.undefined
    expect(ctx.stdout).to.match(/^(Your diff scored|The diff of the working tree was empty)/)
  })
})
