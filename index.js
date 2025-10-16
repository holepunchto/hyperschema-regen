#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
// const proc = require("bare-subprocess");
const Hyperdispatch = require('hyperdispatch')
const Hyperschema = require('hyperschema')
const HyperDB = require('hyperdb/builder')
const Hrpc = require('hrpc')
const { header, summary, command, flag, arg } = require('paparam')

const cmd = command(
  'regen',
  header('Regenerate schema files'),
  summary(
    'Regenerate schema files from JSON at a specific Git commit (supports hyperschema, hyperdb, hyperdispatch and hrpc)'
  ),
  flag('--commit|-c [hash]', 'Git commit hash to regenerate from'),
  flag('--output|-o [dir]', 'Output directory for generated files. Defaults to input directory'),
  flag('--verbose|-v', 'Verbose output'),
  arg('[path]', 'Path to directory to walk through to find JSON files. Default: ./spec'),
  () => {
    const targetFolder = path.normalize(cmd.args.path || './spec')
    const outputFolder = cmd.flags.output ? path.normalize(cmd.flags.output) : targetFolder

    console.log(`Regenerating schema files from ${green(targetFolder)} to ${green(outputFolder)}`)

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
          Hyperschema.toDisk(hyperschema, outputDir)
          if (cmd.flags.verbose) {
            console.log(` - Generated hyperschema file ${green(outputDir)}`)
          }
          break
        }
        case 'hrpc.json': {
          const schemaDir = directory.replace('/hrpc', '/hyperschema')
          const hrpc = Hrpc.from(schemaDir, directory)
          Hrpc.toDisk(hrpc, outputDir)
          if (cmd.flags.verbose) {
            console.log(` - Generated hrpc file ${green(outputDir)}`)
          }
          break
        }
        case 'db.json': {
          const schemaDir = directory.replace('/hyperdb', '/hyperschema')
          const hyperdb = HyperDB.from(schemaDir, directory)
          HyperDB.toDisk(hyperdb, outputDir)
          if (cmd.flags.verbose) {
            console.log(` - Generated hyperdb file ${green(outputDir)}`)
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
          Hyperdispatch.toDisk(hyperdispatch, outputDir)
          if (cmd.flags.verbose) {
            console.log(` - Generated hyperdispatch file ${green(outputDir)}`)
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
