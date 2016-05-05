#$TRAVIS_BRANCH
if [ $TRAVIS_BRANCH == 'master' ] ; then
    ssh $DEPLOY_USER@$DEPLOY_HOST 'bash -l -i -c "cd ./gfw-machine-env/gfw-story-api && ./deploy.sh"'
else
    echo "Not deploying, since this branch isn't master."
fi
