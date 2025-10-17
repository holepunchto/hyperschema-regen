#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const proc = require('child_process')
const Hyperdispatch = require('hyperdispatch')
const Hyperschema = require('hyperschema')
const HyperDB = require('hyperdb/builder')
const Hrpc = require('hrpc')
const { header, summary, command, flag, arg, validate } = require('paparam')

const cmd = command(
  'hyperschema-regen',
  header('Regenerate schema files'),
  summary(
    'Regenerate schema files from JSON at a specific Git commit (supports hyperschema, hyperdb, hyperdispatch and hrpc)'
  ),
  flag('--commit|-c [hash]', 'Git commit hash to regenerate from'),
  flag('--output|-o [dir]', 'Output directory for generated files. Defaults to input directory'),
  flag('--chdir [dir]', 'Change directory for running commands from and git checkout'),
  flag('--verbose|-v', 'Verbose output'),
  flag(
    '--require|-r [require]',
    "Require hyperdb helpers against namespace using 'namespace:path' pair. E.g. my-namespace:path/to/file.js"
  ).multiple(),
  validate(
    ({ flags }) => flags.require.every((r) => /^[\w-]+:.*.js$/i.test(r)),
    '--require must be valid namespace:path pair. E.g. my-namespace:path/to/file.js'
  ),
  arg('[path]', 'Path to directory to walk through to find JSON files. Default: ./spec'),
  async () => {
    const targetFolder = path.normalize(cmd.args.path || './spec')
    const outputFolder = cmd.flags.output ? path.normalize(cmd.flags.output) : targetFolder

    console.log(`Regenerating schema files from ${blue(targetFolder)} to ${green(outputFolder)}`)

    if (cmd.flags.chdir) {
      console.log(`\nChanging directory to ${blue(cmd.flags.chdir)}`)
      process.chdir(cmd.flags.chdir)
      console.log('')
    }

    if (cmd.flags.commit) {
      console.log(`\nChecking out commit ${blue(cmd.flags.commit)} for ${blue(targetFolder)}`)
      proc.spawnSync('git', ['checkout', cmd.flags.commit, targetFolder], { stdio: 'inherit' })
      console.log('')
    }

    // Get files and handle hyperschema first
    const schemaFiles = findSchemaFiles(targetFolder).sort((a, b) =>
      a.endsWith('schema.json') ? -1 : 1
    )

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true })
    }

    for (const file of schemaFiles) {
      const fileName = path.basename(file)
      const directory = path.dirname(file)
      const outputDir = outputFolder ? directory.replace(targetFolder, outputFolder) : directory

      switch (fileName) {
        case 'schema.json': {
          const hyperschema = Hyperschema.from(directory)
          try {
            Hyperschema.toDisk(hyperschema, outputDir)
            if (cmd.flags.verbose) {
              console.log(` - Generated hyperschema file ${green(outputDir)}`)
            }
          } catch (e) {
            console.error(` - Error generating hyperschema file ${red(outputDir)}:`, e)
            process.exit(1)
          }
          break
        }
        case 'hrpc.json': {
          const schemaDir = directory.replace('/hrpc', '/hyperschema')
          const hrpc = Hrpc.from(schemaDir, directory)
          try {
            Hrpc.toDisk(hrpc, outputDir)

            if (cmd.flags.verbose) {
              console.log(` - Generated hrpc file ${green(outputDir)}`)
            }
          } catch (e) {
            console.error(` - Error generating hrpc file ${red(outputDir)}:`, e)
            process.exit(1)
          }
          break
        }
        case 'db.json': {
          const schemaDir = directory.replace('/hyperdb', '/hyperschema')
          const hyperdb = HyperDB.from(schemaDir, directory)
          try {
            if (cmd.flags.require) {
              cmd.flags.require.forEach((r) => {
                const [namespace, path] = r.split(':')
                hyperdb.getNamespace(namespace).require(path)
              })
            }

            HyperDB.toDisk(hyperdb, outputDir)
            if (cmd.flags.verbose) {
              console.log(` - Generated hyperdb file ${green(outputDir)}`)
            }
          } catch (e) {
            console.error(` - Error generating hyperdb file ${red(outputDir)}:`, e)
            process.exit(1)
          }
          break
        }
        case 'dispatch.json': {
          const contents = JSON.parse(fs.readFileSync(file, 'utf8'))
          const schemaDir = directory.replace('/hyperdispatch', '/hyperschema')
          const hyperdispatch = Hyperdispatch.from(
            schemaDir,
            directory,
            contents.offset
              ? {
                  offset: contents.offset
                }
              : undefined
          )
          try {
            Hyperdispatch.toDisk(hyperdispatch, outputDir)
            if (cmd.flags.verbose) {
              console.log(` - Generated hyperdispatch file ${green(outputDir)}`)
            }
          } catch (e) {
            console.error(` - Error generating hyperdispatch file ${red(outputDir)}:`, e)
            process.exit(1)
          }

          break
        }
      }
    }
  }
)

cmd.parse()

function findSchemaFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const subFiles = findSchemaFiles(fullPath)
      results.push(...subFiles)
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
      results.push(fullPath)
    }
  }

  return results
}

function green(text) {
  return `\x1b[32m${text}\x1b[0m`
}

function blue(text) {
  return `\x1b[34m${text}\x1b[0m`
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`
}
