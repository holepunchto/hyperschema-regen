# hyperschema-regen

A tool for regenerating and validating schema files from JSON and a Git commit.

Can checkout entire spec folders to previous releases (based on version tags) and validate individual JSON files against previous releases.

> [!note]
> Will find all JSON files in the folder. Provide your `./spec` folder or similar, not the individual folders.

## Usage

### validate

Validate checks out the previous release tag for the given target file and compares it to the current version.

Ensures no fields in the previous schema are missing or changed.

```
npx @holepunchto/hyperschema-regen validate <target_file>
```

e.g.

```
npx @holepunchto/hyperschema-regen validate spec/contract/hyperdb/db.json
```

### checkout

Checkout `./spec` to previous release tag

```
npx @holepunchto/hyperschema-regen checkout
```

## Help

```
Regenerate schema files

  hyperschema-regen [flags] [command]

  Flags:
    --chdir [dir]   Change working directory
    --help|-h       Show help

  Commands:
    checkout        Checkout spec to previous release tag
    validate        Compare schema files for a target
```
