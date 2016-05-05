#!/bin/bash
set -x

ssh-keyscan -H $DEPLOY_HOST >> $HOME/.ssh/known_hosts
# Import the SSH deployment key
openssl aes-256-cbc -K $encrypted_8ad35dcac0d8_key -iv $encrypted_8ad35dcac0d8_iv -in deploy-key.enc -out deploy-key -d
rm deploy-key.enc # Don't need it anymore
chmod 600 deploy-key
mv deploy-key ~/.ssh/id_rsa
