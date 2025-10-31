const proc = require('bare-subprocess')
const tmp = require('test-tmp')
const fs = require('bare-fs')
const test = require('brittle')
const path = require('bare-path')
const { Version } = require('bare-semver')

function checkoutSpec(dir, tag, specFolder = './spec') {
  proc.spawnSync('git', ['checkout', tag, specFolder], { stdio: 'pipe', cwd: dir })
}

async function getSchemas(t, target) {
  fs.statSync(target)

  const dir = await tmp(t)

  const currentTag = getTag()
  const previousTag = getPreviousRelease()

  t.not(
    currentTag,
    previousTag,
    `tags are different. Current: ${currentTag}, Previous: ${previousTag}`
  )

  // Copy target to temp directory
  const targetCopy = path.join(dir, path.basename(target))
  fs.copyFileSync(target, targetCopy)

  fs.statSync(targetCopy)

  // Get old schema
  proc.spawnSync('git', ['checkout', previousTag, target], { stdio: 'inherit' })
  const oldSpec = path.join(dir, `${previousTag}-${path.basename(target)}`)
  fs.copyFileSync(target, oldSpec)

  fs.statSync(oldSpec)

  // Restore original spec
  fs.copyFileSync(targetCopy, target)

  const previousSchema = JSON.parse(fs.readFileSync(oldSpec))
  const currentSchema = JSON.parse(fs.readFileSync(targetCopy))

  t.ok(previousSchema, 'loaded old schema')
  t.ok(currentSchema, 'loaded new schema')

  t.ok(Object.keys(previousSchema).length > 0, 'old schema has keys')
  t.ok(Object.keys(currentSchema).length > 0, 'new schema has keys')

  return { previousSchema, previousTag, currentSchema, currentTag }
}

// Helpers
async function compareSchema(target) {
  await test(`comparing ${target}`, async (t) => {
    const { previousSchema, currentSchema, previousTag, currentTag } = await getSchemas(t, target)

    t.pass(`Checking schema ${target}. Current: ${currentTag}, Previous: ${previousTag}`)

    const previousSchemaValues = previousSchema.schema.reduce((acc, s) => {
      acc[`@${s.namespace}/${s.name}`] = s
      return acc
    }, {})

    const currentSchemaValues = currentSchema.schema.reduce((acc, s) => {
      acc[`@${s.namespace}/${s.name}`] = s
      return acc
    }, {})

    for (const [key, value] of Object.entries(previousSchemaValues)) {
      await t.test(key, (t) => {
        const current = currentSchemaValues[key]

        t.ok(current, `schema ${key} exists in current schema`)
        t.is(current.id, value.id, `id matches`)

        for (const k in current) {
          console.log('checking ', k)
          if (typeof current[k] === 'object') {
            t.alike(current[k], value[k], `${k} matches`)
          } else {
            t.is(current[k], value[k], `${k} matches`)
          }
        }
      })
    }
  })
}

function getPreviousRelease() {
  const currentTag = getTag()

  const currentVersion = Version.parse(currentTag.replace(/^v/, ''))
  let version = new Version(currentVersion.major, currentVersion.minor, currentVersion.patch)

  // If we're on a new release, we want to look at the previous release
  if (version.patch === 0) version = subMinor(version)

  // Only even minor releases
  if (version.minor % 2 === 1) version = subMinor(version)

  if (currentVersion.compare(version) !== 1) {
    throw new Error('Current version is not greater than the previous release')
  }

  const tags = proc
    .spawnSync(
      'git',
      ['tag', '-l', `v${version.major}.${version.minor}.*`, '--sort=-version:refname'],
      {
        stdio: 'pipe'
      }
    )
    .stdout.toString()
    .trim()

  const latestRelease = tags.split('\n')[0]

  return latestRelease
}

function subMinor(version) {
  return new Version(version.major, Math.max(version.minor - 1, 0), 0)
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

module.exports = {
  compareSchema,
  checkoutSpec,
  getPreviousRelease,
  getTag,
  getSchemas
}
