# Blockchain Libs

![](https://github.com/OneKeyHQ/blockchain-libs/actions/workflows/test.yml/badge.svg)

## I want to develop

1. [Install nodejs](https://treehouse.github.io/installation-guides/mac/node-mac.html), recommend >= 14.x
2. [Install yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
3. `cd $the_project`
4. `yarn`
<!-- 5. `yarn fix` before commit(deprecated) -->

### Before start commit

[Commit-Message details](https://github.com/conventional-changelog/commitlint)

```
A commit message consists of three sections: Header(required), Body(optional)
and Footer(optional).

Header is a single line string which is composed of three parts:
type(required), scope(optional) and subject(required).

<type>(<scope>): <subject>
// An empty line
<body>
// An empty line
<footer>

To avoid automatic line wrapping, always wrap lines of a commit message
to 72 characters.

---
Commit method 1 (manually)：
   eg:
      git commit -m "feat: add some new features"
      git commit -m "fix: fix some bugs"

Commit method 2 (interactively)：
   brew install commitizen
   cz c
```

## I want to publish new package

1. `npm install -g conventional-changelog-cli`
2. `yarn version` and input new version, then will update the CHANGELOG.md
3. `git push --tag`

## I want to use it as a package

1. `cd $my_own_project`
2. `yarn add @onekeyfe/blockchain-libs`
