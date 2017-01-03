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
            throw err;
        }
    }

    static * getStories() {
        logger.info('Obtaining stories');
        this.body = yield StoryService.getStories(this.query);
    }

    static * getStoriesByUser() {
        logger.info('Obtaining stories for user with ID', this.params.user_id);
        this.body = yield StoryService.getStoriesByUser(this.params.user_id, this.query.fields);
    }

    static * getStoryById() {
        logger.info('Obtaining stories by id %s', this.params.id);
        this.assert(this.params.id, 400, 'Id param required');
        let story = yield StoryService.getStoryById(this.params.id, this.query.fields);
        if(!story){
            this.throw(404, 'Story not found');
            return;
        }
        this.body = story;
    }

    static * deleteStory() {
        logger.info('Deleting story by id %s', this.params.id);
            try{
            let story = yield StoryService.deleteStoryById(
              this.params.id, JSON.parse(this.request.query.loggedUser).id);

            if (!story) {
              logger.error('Story not found');
              this.throw(404, 'Story not found');
              return;
            }

            this.body = story;
        } catch(err){
            logger.error(err);
            throw err;
        }
    }

    static * updateStory() {
        logger.info('Updating story by id %s', this.params.id);
            try{
            let story = yield StoryService.updateStory(
              this.params.id, this.request.body);

            if (!story) {
              logger.error('Story not found');
              this.throw(404, 'Story not found');
              return;
            }

            this.body = story;
        } catch(err){
            logger.error(err);
            throw err;
        }
    }
}

router.get('/', StoryRouter.getStories);
router.get('/user/:user_id', StoryRouter.getStoriesByUser);
router.get('/:id', StoryValidator.getStoryById, StoryRouter.getStoryById);
router.delete('/:id', StoryValidator.getStoryById, StoryRouter.deleteStory);
router.put('/:id', StoryValidator.getStoryById, StoryRouter.updateStory);
router.post('/', StoryRouter.createStory);


module.exports = router;
