#!/bin/bash
mkdir -p ./package
cd ../
yarn && yarn pack
mv onekeyhq-blockchain-libs-v*.tgz ./example/package/onekeyhq-blockchain-libs.tgz

cd ./example || exit
yarn add ./package/onekeyhq-blockchain-libs.tgz --force && yarn
