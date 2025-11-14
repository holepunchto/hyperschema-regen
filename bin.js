#!/usr/bin/env bare

const {
  header,
  summary,
  command,
  rest,
  flag,
  arg,
  validate: validateArgs,
  description
} = require('paparam')
const { checkout, validate } = require('.')

const checkoutCmd = command(
  'checkout',
  header('Checkout spec to previous release tag'),
  summary('Checkout spec to previous release tag'),
  arg('<spec>', 'The spec folder to checkout'),
  async () => {
    if (cmd.flags.chdir) {
      console.log(`Changing directory to ${blue(cmd.flags.chdir)}`)
      process.chdir(cmd.flags.chdir)
    }

    checkout(checkoutCmd.args.spec)
  }
)

const validateCmd = command(
  'validate',
  summary('Compare schema files for a target'),
  description('Check target files are append-only compared to previous release'),
  rest('[...target]'),
  validateArgs(({ rest }) => rest.length, 'No target(s) specified'),
  async () => {
    if (cmd.flags.chdir) {
      console.log(`Changing directory to ${blue(cmd.flags.chdir)}`)
      process.chdir(cmd.flags.chdir)
    }

    await validate(...validateCmd.rest)
  }
)

const previousCmd = command('previous', summary('Get the previous release tag'), async () => {
  console.log(getPreviousRelease())
})

const cmd = command(
  'hyperschema-regen',
  header('Regenerate schema files'),
  flag('--chdir [dir]', 'Change working directory'),
  checkoutCmd,
  validateCmd,
  previousCmd,
  () => {
    console.log(cmd.help())
  }
)

cmd.parse()
