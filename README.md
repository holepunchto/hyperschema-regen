# hyperschema-regen

A tool for regenerating and validating schema files from JSON and a Git commit.

Can checkout entire spec folders to previous releases (based on version tags) and validate individual JSON files against previous releases.

> [!note]
> Will find all JSON files in the folder. Provide your `./spec` folder or similar, not the individual folders.

## Usage

```
npx @holepunchto/hyperschema-regen <target_file>
```

e.g.

```
npx @holepunchto/hyperschema-regen spec/contract/hyperdb/db.json
```

## Help

```
Regenerate schema files

  hyperschema-regen [flags] [command] [...target]

  Compare schema files for a target

  Check target files are append-only compared to previous release

  Arguments:
    [...target]

  Flags:
    --chdir [dir]   Change working directory
    --help|-h       Show help

  Commands:
    checkout        Checkout spec to previous release tag
```
