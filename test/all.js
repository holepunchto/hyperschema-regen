const test = require('brittle')
const { compareSchemas } = require('../')

const schema = require('./fixtures/db-old.json')

test('can compare unchanged schemas', (t) => {
  compareSchemas(schema, schema)
  t.pass()
})

test('fails on changed schemas', (t) => {
  {
    const changed = {
      ...schema,
      schema: schema.schema.map((s) => ({ ...s, id: s.id + 1 }))
    }

    t.exception(() => compareSchemas(schema, changed), /Error: IDs do not match: 1 !== 0/)
  }

  {
    const changed = {
      ...schema,
      schema: schema.schema.map((s) => ({ ...s, namespace: 'fail' }))
    }

    t.exception(() => compareSchemas(schema, changed), /Error: collection NOT in current schema/)
  }

  {
    const changed = {
      ...schema,
      schema: schema.schema.map((s) => ({ ...s, version: 0, versionField: 'test' }))
    }

    t.exception(() => compareSchemas(schema, changed), /Error: version cannot decrease/)
  }
})
