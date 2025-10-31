#!/usr/bin/env bare

const path = require('bare-path')
const process = require('bare-process')
const fs = require('bare-fs')
const { header, summary, command, rest, flag, arg, validate } = require('paparam')
const { compareSchema, getPreviousRelease, checkoutSpec } = require('.')

const checkout = command(
  'checkout',
  header('Checkout spec to previous release tag'),
  summary('Checkout spec to previous release tag'),
  arg('<spec>', 'The spec folder to checkout'),
  async () => {
    if (cmd.flags.chdir) {
      console.log(`\nChanging directory to ${blue(cmd.flags.chdir)}`)
      process.chdir(cmd.flags.chdir)
    }
    const previousTag = getPreviousRelease()
    const specFolder = path.normalize(checkout.args.spec || './spec')

    console.log(`Checking out ${blue(specFolder)} to ${blue(previousTag)}`)

    // Already changed directory
    checkoutSpec(undefined, previousTag, specFolder)
  }
)

const cmd = command(
  'hyperschema-regen',
  header('Regenerate schema files'),
  summary(
    'Regenerate schema files from JSON at a specific Git commit (supports hyperschema, hyperdb, hyperdispatch and hrpc)'
  ),
  flag('--chdir [dir]', 'Change working directory'),
  rest('[...target]'),
  validate(({ rest }) => rest.length, 'No target(s) specified'),
  checkout,
  async () => {
    if (cmd.flags.chdir) {
      console.log(`\nChanging directory to ${blue(cmd.flags.chdir)}`)
      process.chdir(cmd.flags.chdir)
      console.log('')
    }

    for (const target of cmd.rest) {
      const targetPath = path.normalize(target)

      if (!fs.existsSync(targetPath)) {
        console.error(red(`Target ${targetPath} does not exist`))
        process.exit(1)
      }

      console.log(`Comparing schema files for ${blue(targetPath)}`)

      await compareSchema(targetPath)
    }
  }
)

cmd.parse()

function blue(text) {
  return `\x1b[34m${text}\x1b[0m`
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`
}
