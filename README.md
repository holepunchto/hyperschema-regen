# hyperschema-regen

A tool for regenerating and validating schema files from JSON and a Git commit.

Can checkout entire spec folders to previous releases (based on version tags) and validate individual JSON files against previous releases.

## Usage

Best practise is to use this in your scripts that generate your schemas.

```js
const regen = require('@holepunchto/hyperschema-regen')
regen.checkout()

buildMySpec()

regen.validate('spec/hyperdb/db.json',)
```

### validate

Validate checks out the previous release tag for the given target file and compares it to the current version.

Ensures no fields in the previous schema are missing or changed.

```js
const regen = require('@holepunchto/hyperschema-regen')

regen.validate('spec/contract/hyperdb/db.json', 'spec/local/hyperdb/db.json')
```

### checkout

Checkout `./spec` to previous release tag

```js
const regen = require('@holepunchto/hyperschema-regen')
regen.checkout()
```
