'use strict';

var Router = require('koa-router');
var logger = require('logger');
var StorySerializer = require('serializers/storySerializer');
var StoryValidator = require('validators/storyValidator');
var Story = require('models/story');
var router = new Router({
    prefix: '/story'
});
var cartoDBService = require('services/cartoDBService');


class StoryRouter {
    static * createStory() {
        logger.info('Creating story with body', this.request.body);
        try{
            //if user is logged. this param is add by api-gateway
            if(this.request.body.loggedUser){
                this.request.body.userId = this.request.body.loggedUser.data.id;
            }
            yield cartoDBService.createStory(this.request.body);
            this.response.status = 204;
        }catch(err){
            logger.error(err);
        }
    }

    static * cacheAllStories(stories){
        logger.debug('Removing cache');
        yield Story.remove({});
        logger.debug('Populating cache');
        for(let i = 0, length = stories.length; i < length; i++){
            yield new Story(stories[i]).save();
        }
    }

    static formatStory(story){
        if(!story){
            return {};
        }
        let newStory = {
            name: story.name,
            title: story.title,
            createdAt: story.created,
            updatedAt: story.updated,
            id: story.id,
            visible: story.visible,
            details: story.details,
            date: story.date,
            email: story.email,
            location: story.location,
            userId: story.user_id,
            media: JSON.parse(story.media),
            lat: story.lat,
            lng: story.lng
        };
        return newStory;
    }

    static formatStories(stories){
        let newStories = [];

        if(stories){
            for(let i = 0, length = stories.length; i < length; i++){
                newStories.push(StoryRouter.formatStory(stories[i]));
            }
        }
        return newStories;
    }

    static * getStories() {
        logger.info('Obtaining stories');
        let stories = yield cartoDBService.getStories();
        try{
            stories = StoryRouter.formatStories(stories);
            yield StoryRouter.cacheAllStories(stories);
            this.body = StorySerializer.serialize(stories);
        }catch(e){
            logger.error(e);
        }
    }

    static * getStoryById() {
        logger.info('Obtaining stories by id %s', this.params.id);
        this.assert(this.params.id, 400, 'Id param required');
        logger.debug('Searching in cache');
        let story = yield Story.findOne({id: this.params.id}, {_id:0, __v:0});
        if(story){
            logger.debug('Found in cache. Returning');
            this.body = StorySerializer.serialize(story);
            return;
        }
        logger.debug('Not find in cache. Obtaining of cartodb');
        story = yield cartoDBService.getStoryById(this.params.id);
        if(story){
            story = StoryRouter.formatStory(story);
            yield new Story(story).save();
            this.body = StorySerializer.serialize(story);
        }
        this.throw(404, 'Story not found');
    }


}

router.get('/', StoryRouter.getStories);
router.get('/:id', StoryValidator.getStoryById, StoryRouter.getStoryById);
router.post('/',  StoryRouter.createStory);

module.exports = router;
