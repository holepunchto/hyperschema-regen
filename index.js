const proc = require('bare-subprocess')
const fs = require('bare-fs')
const path = require('bare-path')
const process = require('bare-process')
const sameObject = require('same-object')

function verbose(...msg) {
  if (process.env.REGEN_VERBOSE) {
    console.log(...msg)
  }
}

function checkoutSpec(dir, tag, specFolder = './spec') {
  proc.spawnSync('git', ['checkout', tag, specFolder], { stdio: 'pipe', cwd: dir })
}

function getSchemas(target, opts = {}) {
  fs.statSync(target)

  const currentTag = getTag()
  const previousTag = opts.tag || getPreviousRelease()

  if (currentTag === previousTag && currentTag !== 'hyperschema-checkpoint') {
    throw new Error(`tags are the same. Current: ${currentTag}, Previous: ${previousTag}`)
  }

  // Open target
  const currentSchemaContents = fs.readFileSync(target)

  const currentSchema = JSON.parse(currentSchemaContents)
  if (Object.keys(currentSchema).length === 0) {
    throw new Error('Target schema empty')
  }

  // Get old schema
  proc.spawnSync('git', ['checkout', previousTag, target], { stdio: 'inherit' })
  const previousSchema = JSON.parse(fs.readFileSync(target))

  // Put target back
  fs.writeFileSync(target, currentSchemaContents)

  if (Object.keys(previousSchema).length === 0) {
    throw new Error('Previous schema empty')
  }

  return { previousSchema, previousTag, currentSchema, currentTag }
}

// Helpers
function compareSchemas(previousSchema, currentSchema) {
  const previousSchemaValues = previousSchema.schema.reduce((acc, s) => {
    acc[`@${s.namespace}/${s.name}`] = s
    return acc
  }, {})

  const currentSchemaValues = currentSchema.schema.reduce((acc, s) => {
    acc[`@${s.namespace}/${s.name}`] = s
    return acc
  }, {})

  for (const [key, value] of Object.entries(previousSchemaValues)) {
    verbose('-', blue(key))
    const current = currentSchemaValues[key]

    if (current) {
      verbose(`  - collection exists`)
    } else {
      throw new Error(`collection NOT in current schema`)
    }

    // Explicity check this first
    if (current.id === value.id) {
      verbose(`  - id matches: ${current.id}`)
    } else {
      throw new Error(`IDs do not match: ${current.id} !== ${value.id}`)
    }

    for (const k in current) {
      if (k === 'version') {
        validateVersion(current[k], value[k])
        continue
      }

      if (k === 'versionField') {
        validateVersionVield(current[k], value[k])
        continue
      }

      if (k === 'indexes') {
        validateIndexes(current[k], value[k])
        continue
      }

      if (k === 'deprecated') {
        continue
      }

      if (
        (typeof current[k] === 'object' && sameObject(current[k], value[k])) ||
        current[k] === value[k]
      ) {
        verbose(`  - ${k} matches`)
        continue
      }

      throw new Error(`${k} does not match: ${current[k]} !== ${value[k]}`)
    }
  }
}

function validateIndexes(newIndexes, oldIndexes) {
  if (newIndexes.length < oldIndexes.length) {
    throw new Error(`Indexes are append-only: length changed`)
  }

  for (let i = 0; i < oldIndexes.length; i++) {
    if (newIndexes[i] !== oldIndexes[i]) {
      throw new Error(`Indexes are append-only: ${newIndexes[i]} !== ${oldIndexes[i]}`)
    }
  }
}

function validateVersion(newV, oldV) {
  if (typeof newV !== 'number') throw new Error(`version must be number`)
  if (!oldV) return
  if (newV < oldV) throw new Error('version cannot decrease')
}

function validateVersionVield(newV, oldV) {
  if (!oldV) return
  if (oldV !== newV) {
    throw new Error(`versionField does not match: ${oldV} !== ${newV}`)
  }
}

function getPreviousRelease() {
  const currentTag = getTag()

  if (currentTag === 'hyperschema-checkpoint') {
    return 'hyperschema-checkpoint'
  }

  const tags = proc
    .spawnSync('git', ['tag', '-l', '--sort=-version:refname'], { stdio: 'pipe' })
    .stdout.toString()
    .trim()
    .split('\n')
    .filter((t) => t && !t.includes('-') && t !== currentTag)

  const latestRelease = tags[0]

  if (!latestRelease) {
    throw new Error('No previous stable release found')
  }

  const newer = proc.spawnSync('git', [
    'merge-base',
    '--is-ancestor',
    latestRelease,
    'hyperschema-checkpoint'
  ])

  if (!newer.status) {
    return 'hyperschema-checkpoint'
  }

  return latestRelease
}

function getTag(tag) {
  const args = ['describe', '--tags']

  if (tag) {
    args.push('--abbrev=0')
    args.push(tag)
  }
  const tagInfo = proc.spawnSync('git', args, { stdio: 'pipe' }).stdout.toString().trim()
  return tagInfo
}

function checkout(spec = './spec', opts = {}) {
  const previousTag = opts.tag || getPreviousRelease()
  const specFolder = path.normalize(spec)

  console.log(`Checking out ${blue(specFolder)} to ${blue(previousTag)}`)

  // Already changed directory
  checkoutSpec(undefined, previousTag, specFolder)
}

function validate(...targets) {
  // optional trailing options
  let opts = {}
  if (targets.length && typeof targets[targets.length - 1] === 'object') {
    opts = targets.pop()
  }

  for (const target of targets) {
    const targetPath = path.normalize(target)

    if (!fs.existsSync(targetPath)) {
      console.error(red(`Target ${targetPath} does not exist`))
      process.exit(1)
    }

    console.log(`Comparing schema files for ${blue(targetPath)}`)

    const { previousSchema, currentSchema, currentTag, previousTag } = getSchemas(targetPath, opts)
    console.log(`Current: ${currentTag}, Previous: ${previousTag}`)

    compareSchemas(previousSchema, currentSchema)

    console.log(`✅ Schema OK for ${blue(targetPath)}`)
  }
}

function blue(text) {
  return `\x1b[34m${text}\x1b[0m`
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`
}

module.exports = {
  blue,
  checkout,
  validate,
  getPreviousRelease,
  compareSchemas
}
