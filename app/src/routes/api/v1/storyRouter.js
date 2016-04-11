'use strict';

var Router = require('koa-router');
var logger = require('logger');
var UserSerializer = require('serializers/storySerializer');
var StoryValidator = require('validators/storyValidator');
var Story = require('models/story');
var router = new Router({
    prefix: '/story'
});


class StoryRouter {
    static * createStory(){
        logger.info('Creating story with body', this.request.body);
        this.body='create';
    }

    static * getStories(){
        logger.info('Obtaining stories');
        this.body='list';
    }

    static * getStoryById(){
        logger.info('Obtaining stories by id %s', this.params.id);
        this.assert(this.params.id, 400, 'Id param required');
        this.body='byid';
    }


}

router.get('/', StoryRouter.getStories);
router.get('/:id',  StoryValidator.getBydId, StoryRouter.getStoryById);
router.post('/', StoryValidator.create, StoryRouter.createStory);

module.exports = router;
