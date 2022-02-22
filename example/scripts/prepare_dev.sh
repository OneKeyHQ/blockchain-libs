#!/bin/bash
mkdir -p ./package
cd ../
yarn && yarn pack
mv onekeyfe-blockchain-libs-v*.tgz ./example/package/onekeyfe-blockchain-libs.tgz

cd ./example || exit
yarn cache clean
yarn add ./package/onekeyfe-blockchain-libs.tgz --force && yarn
