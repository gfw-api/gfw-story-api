'use strict';

var Router = require('koa-router');
var logger = require('logger');
var StoryValidator = require('validators/storyValidator');
var StoryService = require('services/storyService');
var router = new Router({
    prefix: '/story'
});

class StoryRouter {
    static * createStory() {
        logger.info('Creating story with body', this.request.body);
        try {
            this.body = yield StoryService.createStory(this.request.body);

        } catch (err) {
            logger.error(err);
        }
    }

    static * getStories() {
        logger.info('Obtaining stories');
        this.body = yield StoryService.getStories();
    }

    static * getStoryById() {
        logger.info('Obtaining stories by id %s', this.params.id);
        this.assert(this.params.id, 400, 'Id param required');
        this.body = yield StoryService.getStoryById(this.params.id);
    }


}

router.get('/', StoryRouter.getStories);
router.get('/:id', StoryValidator.getStoryById, StoryRouter.getStoryById);
router.post('/', StoryRouter.createStory);

module.exports = router;
