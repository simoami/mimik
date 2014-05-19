![Mimik](https://cloud.githubusercontent.com/assets/2038264/2922406/428777b0-d701-11e3-8ef1-a11834e93fa5.png)

[![Build Status](https://travis-ci.org/simoami/mimik.svg?branch=master)](https://travis-ci.org/simoami/mimik)
[![Coverage Status](https://coveralls.io/repos/simoami/mimik/badge.png)](https://coveralls.io/r/simoami/mimik)
[![Dependency Status](https://david-dm.org/simoami/mimik.svg)](https://david-dm.org/simoami/mimik)

## Introduction

Mimik is a behavior-driven testing framework and UI automation platform. Similar to [Cucumber](http://cukes.info/), it enables Agile story-writing allowing all stakeholders to describe how software should behave in natural language.

Mimik focuses on simplicity and brings excitement to test writing. Behavior is described following the [Guerkin](https://github.com/cucumber/cucumber/wiki/Gherkin) syntax:

```
Feature: Login
  In order to access the application
  As a registered user
  I need to be able to log in

  Scenario:
    Given I am a registered user
    When I enter my credentials and submit the login form
    Then I should see a welcome page
```

Mimik is built on top of some of the best open source projects available:

[Mocha](http://visionmedia.github.io/mocha/): BDD Testing framework.  
[Yadda](https://github.com/acuminous/yadda): Advanced BDD and Gherkin Given/When/Then  parser.  
[Chai](http://chaijs.com): Assertion library.  
[Selenium](http://docs.seleniumhq.org/projects/webdriver/): Webdriver based browser automation.

## Main Features

- BDD / Cucumber style, Feature based testing
- supports features written in multiple languages
- Supports both Javascript and Coffeescript source files.
- Unit and Functional Testing
- Generate test code automatically
- Watch for file changes and run specific tests automatically
- Support multiple parallel testing strategies
- Supports Cross-browser testing
- Run functional tests on local browsers or cloud-based services
- Amazing HTML5 reports
- Jira and Testrail integration
- More: views, junit output, annotation support, filtering by annotations, 
- Lastly, it's Free!

<!-- View a comprehensive list of all features compared to other testing tools. -->


## Content:

[Installation](#installation)  
[Quick Start](#quick-start)  
[Documentation](#documentation)  
[Command Usage](#command-usage)  
[Examples](#examples)  
[Contributing](#contributing)  
[Maintainer](#maintainer)  
[License](#license)  

---

## Installation

[Node.js](http://nodejs.org/) and [NPM](https://www.npmjs.org) are required in order to install Mimik. NPM is packaged with Node.js, so it's typically installed as well. If not, you can still install it separately.

```
npm install mimik -g
```

The flag `-g` ensures that the mimik command is accessible globally.

## Quick start

TBD

## Documentation

You can access the full documentation [here]().

## Command Usage

```
  Usage: mimik [options] [command]

  Commands:

    run                    run feature tests found in the [target] path
    watch                  watch for file changes in the [target] path, then run feature tests
    generate               generate step definition templates for the specified feature file <path>

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
    --rerun <path>              path to generate a list of failed features or rerun features from an previously generated file
    --debug                     enable debug logging
    --log <path>                path including file name to create a file log
```

## Examples

See the [examples](./examples) folder.

## Contributing

See [here](./CONTRIBUTING.md).

## Maintainer

[Simo Moujami](http://www.linkedin.com/in/simoami)

## License

MIT. See [LICENSE-MIT](./LICENSE-MIT).

