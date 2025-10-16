# Regen

A tool for regenerating schema files from JSON and a Git commit.

Will checkout the provided commit for the target folder, and regenerate the schema files from the JSON files in the target folder (or provided output folder).

> [!note]
> Will find all JSON files in the folder. Provide your `./spec` folder or similar, not the individual folders.

## Usage

```
npx @holepunchto/regen -c [commit] <target_folder>
```

e.g.

```
npx @holepunchto/regen -c main ./spec
```

## Help

```
Regenerate schema files

  regen [flags] [path]

  Regenerate schema files from JSON at a specific Git commit (supports hyperschema, hyperdb, hyperdispatch and hrpc)

  Arguments:
    [path]               Optional. Path to directory to walk through to find JSON files. Default: ./spec

  Flags:
    --commit|-c [hash]   Git commit hash to regenerate from
    --output|-o [dir]    Output directory for generated files. Defaults to input directory
    --verbose|-v         Verbose output
    --help|-h            Show help
```
