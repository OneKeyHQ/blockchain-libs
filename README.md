# Blockchain Libs

![](https://github.com/OneKeyHQ/blockchain-libs/actions/workflows/test.yml/badge.svg)

## I want to develop

1. [Install nodejs](https://treehouse.github.io/installation-guides/mac/node-mac.html), recommend >= 14.x
2. [Install yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
3. `cd $the_project`
4. `yarn`
<!-- 5. `yarn fix` before commit(deprecated) -->

### Before start commit

[Commit-Message details](https://www.ruanyifeng.com/blog/2016/01/commit_message_change_log.html)

```
每次提交，Commit message 都包括三个部分：Header，Body 和 Footer。

<type>(<scope>): <subject>
// 空一行
<body>
// 空一行
<footer>

其中，Header 是必需的，Body 和 Footer 可以省略。
不管是哪一个部分，任何一行都不得超过72个字符（或100个字符）。这是为了避免自动换行影响美观。
2.1 Header
Header部分只有一行，包括三个字段：type（必需）、scope（可选）和subject（必需）。
---
方式一(手动编辑)：
   eg:
      git commit -m "feat: add some new features"
      git commit -m "fix: fix some bugs"

方式二(交互式)：
   brew install commitizen
   cz c
```

## I want to publish new package

1. `npm install -g conventional-changelog-cli`
2. `yarn version` and input new version, then will update the CHANGELOG.md
3. `git push --tag`

## I want to use it as a package

1. [Generate PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
   - Require `read:packages` permission only
2. `cd $my_own_project`
3. Add the following to your local `.npmrc`

```
@onekeyhq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${MY_PAT}
```

4. `yarn add @onekeyhq/blockchain-libs`
