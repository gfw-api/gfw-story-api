'use strict';
var logger = require('logger');
var ErrorSerializer = require('serializers/errorSerializer');

class StoryValidator {

    static * create(next) {
        logger.debug('Validate register story');
        this.checkBody('title').notEmpty();
        this.checkBody('the_geom').notEmpty();
        this.checkBody('email').notEmpty();

        if(this.errors) {
            logger.debug('errors ', this.errors);
            this.body = ErrorSerializer.serializeValidationBodyErrors(this.errors);
            this.status = 400;
            return;
        }
        yield next;

    }

    static * getStoryById(next){
        logger.debug('Validate get story by id');
        this.checkParams('id').notEmpty();
        if(this.errors) {
            logger.debug('errors ', this.errors);
            this.body = ErrorSerializer.serializeValidationBodyErrors(this.errors);
            this.status = 400;
            return;
        }
        yield next;
    }

}

module.exports = StoryValidator;
