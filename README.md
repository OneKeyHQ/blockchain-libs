# Blockchain Libs

![](https://github.com/OneKeyHQ/blockchain-libs/actions/workflows/test.yml/badge.svg)

## I want to develop

1. [Install nodejs](https://treehouse.github.io/installation-guides/mac/node-mac.html), recommend >= 14.x
2. [Install yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
3. `cd $the_project`
4. `yarn`
5. `yarn fix` before commit

## I want to publish new package

1. `yarn version` and input new version
2. git push --tag

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
