![Mimik](https://cloud.githubusercontent.com/assets/2038264/2922406/428777b0-d701-11e3-8ef1-a11834e93fa5.png)

[![Build Status](https://travis-ci.org/simoami/mimik.svg?branch=master)](https://travis-ci.org/simoami/mimik)
[![Coverage Status](https://img.shields.io/coveralls/simoami/mimik.svg)](https://coveralls.io/r/simoami/mimik?branch=master)
[![Dependency Status](https://david-dm.org/simoami/mimik.svg)](https://david-dm.org/simoami/mimik)

## Introduction

Mimik is a behavior-driven testing framework and UI automation platform. Similar to [Cucumber](http://cukes.info/), it enables Agile story-writing allowing all stakeholders to describe how software should behave in natural language.

Mimik focuses on simplicity and brings excitement to test writing. Tests follow a simple text structure to describe domain-specific behavior. This text structure is known as [Guerkin](https://github.com/cucumber/cucumber/wiki/Gherkin):

```
Feature: Login
  In order to access the application
  As a registered user
  I need to be able to log in

  Scenario: Successful login
    Given I am a registered user
    When I enter my credentials and submit the login form
    Then I should see a welcome page
```

Mimik is built on top of some of the best open source projects available:

[Mocha](http://mochajs.org/): BDD Testing framework.  
[Yadda](https://github.com/acuminous/yadda): Advanced BDD and Gherkin Given/When/Then  parser.  
[Chai](http://chaijs.com): Assertion library.  
[Selenium](http://docs.seleniumhq.org/projects/webdriver/): Webdriver based browser automation.

## Main Features

- BDD / Cucumber style, Feature based testing
- Supports features written in multiple languages
- Supports both Javascript and Coffeescript source files.
- Unit and Functional Testing
- Generate test source files "step definitions" automatically
- Watch for file changes and run specific tests automatically
- Supports multiple parallel test strategies
- Supports cross-browser testing
- Run functional tests on local browsers or cloud-based services
- Rich HTML5 reports
- Jira and Testrail integration
- Install and run selenium drivers automatically.
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

The flag `-g` ensures that the mimik command is installed and accessible globally.

## Quick Start

Create a folder structure for your test project as follows:

```
tests
├─ features
└─ steps
```
**Note:** This structure is generally recommended, but not required. 

#### Define your Feature

Features are the primary building blocks in Mimik. Here you describe the feature you want to test. Features will contain a title, an optional description to outline the business benefits and goals. A feature will be followed by one or multiple scenarios. Each scenario will contain a series of given/when/then steps.

create the file `features/login.feature` and add the following content to it.
```
Feature: Login
  In order to access my account on Github
  As a registered user
  I need to be able to log in

  Scenario: Successful login

    Given I am a registered user
    When I go to github.com
    And I enter my credentials and submit the login form
    Then I should see a welcome page

```

#### Generate the Step Definitions

Run the following command to generate an empty step definition file template.

```
cd tests
mimik generate features/login.feature
```

An interactive menu will guide you through the process. Select the option to save output to a file when prompted, as follows:
```
Feature file: tests/functional/features/todomvc.feature
Press Ctrl+C to abort

Choose output
  1. javascript (default)
  2. coffeescript
  ›  javascript

Specify the feature file language
  1. English (default)
  2. French
  3. Norwegian
  4. Polish
  5. Spanish
  ›  English

Generate output
  1. Display output (default)
  2. Save to a file
  ›  Save to a file

Specify a path:
  tests/steps/login-steps.js (default)
  › Saving to tests/steps/login-steps.js

```

The generated step definition file should look like this:
```javascript
// Given I am a registered user
Given(/I am a registered user/, function(done) {
    done();
});

// When I go to github.com
When(/I go to github.com/, function(done) {
    done();
});

// And I enter my credentials and submit the login form
And(/I enter my credentials and submit the login form/, function(done) {
    done();
});

// Then I should see a welcome page
Then(/I should see a welcome page/, function(done) {
    done();
});

```
We will edit the generated files further down. For now, let's run the feature as is.

#### Run Mimik

Now that the feature is defined and the corresponding step definition file is generated, go ahead and run mimik from the `tests` folder.

```
mimik run
```

If all the steps above were executed properly, you will get the following output (output is colored):

```
 Found 1 feature
----------------------------------------------------------
  Feature: Login  #tests/features/login.feature
  Tested in firefox

    Scenario: Successful login
       ✓ Given I am a registered user
       ✓ When I go to github.com
       ✓ And I enter my credentials and submit the login form
       ✓ Then I should see a welcome page

  ---------- ----------- ------------- -------- --------- -------- 
  Features   Scenarios   Total Steps   Passed   Skipped   Failed 
  ---------- ----------- ------------- -------- --------- --------
  1          1           4             ✓ 4      0         0      
                                                                  
  Completed 1 feature in 1.37s

```

#### Update the Step Defintions 

TBD

## Documentation

You can access the full documentation [here]().

## Command Usage

### The Mimik command
```
  Usage: mimik [options] [command]

  Commands:

    run                    run feature tests found in the [target] path
    watch                  watch for file changes in the [target] path, then run feature tests
    generate               generate step definition templates for the specified feature file <path>

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -c, --config <path>         specify an external config file
    -b, --browsers <names>      comma-delimited <names> of local browsers to use (chrome|firefox|ie|safari|phantomjs)
    -m, --match <pattern>       only run features matching <pattern>
    --match-invert              inverts --match results
    -T, --tags <names>          only run feature tests annotated with one of the comma-delimited tag <names>
    -E, --exclude-tags <names>  exclude feature tests annotated with one of the comma-delimited tag <names>
    -t, --timeout <ms>          set per-test timeout in milliseconds [10000]
    -s, --slow <ms>             `slow` test threshold in milliseconds [5000]
    -f, --failfast              stop running tests on the first encoutered failure or timeout
    --test-strategy <name>      `test` runs various tests in parallel. `browser` runs each test against mutiple browsers [test]
    --reporters <names>         comma-delimited report <names> to enable. available options: junit,html
    --report-path <path>        path for the generated reports
    --rerun <path>              rerun failed tests recorded in `failed.dat` from the last test run
    --debug                     enable debug logging
    --log <path>                output a log file to filename

  Run mimik [command] --help to see description and available options for a particular command

```

#### Options for the watch command
```
  Usage: watch [options] [path ...]

  Options:

    -h, --help              output usage information
    -d, --watch-delay <ms>  Buffers multiple changes into a single run using a delay in milliseconds [500]
```


### The Selenium Launcher command
```
Usage: wdlauncher [command]

  Commands:

    start                  start the selenium standalone server
    install                install or update missing selenium driver binaries
    status                 display the current available driver binaries

  Options:

    -h, --help       output usage information
    --output <path>  path to the location of the binaries
    -p,--port <num>  optional port for the selenium standalone server
    --auto-install   auto install missing binaries before starting the selenium server
    --overwrite      force download existing binaries
    --debug          enable debug logging
    --log <path>     path including file name to create a file log
```

## Examples

See the [examples](./examples) folder.

## Contributing

See [here](./CONTRIBUTING.md).

## Maintainer

[Simo Moujami](http://www.linkedin.com/in/simoami)

## License

MIT. See [LICENSE-MIT](./LICENSE-MIT).

