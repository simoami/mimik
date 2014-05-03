![Mimik](resources/images/mimik-logo-big.png?raw=true)

[![Build Status](https://travis-ci.org/simoami/mimik.svg?branch=master)](https://travis-ci.org/simoami/mimik)

Mimik is a feature-rich UI automation platform which runs on the browser and Node.js.  It brings BDD style syntax to support Agile story-writing style allowing all stakehohlders to contribute to automation tests. Built on top of some of the best frameworks, it can solve real-world challenges. For more information view the [documentation](http://simoami.github.io/mimik).

## Installation

```
npm install mimik -g
```

## Usage


```
Usage: mimik [options] [command]

  Commands:

    run                    run feature tests found in the [target] path
    generate [options]     generate step definitions for a given feature

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -c, --config <path>         specify an alternative config file
    -b, --browsers <names>      comma-delimited <names> of local browsers to use (chrome|firefox|ie|safari|phantomjs)
    -m, --match <pattern>       only run features matching <pattern>
    --match-invert              inverts --match results
    -T, --tags <names>          only run feature tests annotated with one of the comma-delimited tag <names>
    -E, --exclude-tags <names>  exclude feature tests  annotated with one of the comma-delimited tag <names>
    -t, --timeout <ms>          set per-test timeout in milliseconds [10000]
    -s, --slow <ms>             "slow" test threshold in milliseconds [5000]
    -n, --no-bail               continue running tests even on failure
    --test-strategy <name>      "test" runs different tests in parallel. "browser" runs the same test in mutiple browsers [test]
    --reporters <names>         comma-delimited report <names> to enable. available options: junit,html
    --report-path <path>        path for the generated reports
    --rerun <path>              path to generate a list of failed features or rerun features from an existing file
    --debug                     enable debug logging
    --log <path>                path including file name to create a file log
```

## Tests

  npm test

## Maintainer

[Simo Moujami](www.linkedin.com/in/simoami)


## [Contributing](./CONTRIBUTING.md)
