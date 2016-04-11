'use strict';
var logger = require('logger');
var ErrorSerializer = require('serializers/errorSerializer');

class StoryValidator {

    static * create(next) {
        logger.debug('Validate register user');
        this.checkBody('title').notEmpty();
        this.checkBody('location').notEmpty();
        this.checkBody('email').notEmpty();

        if(this.errors) {
            logger.debug('errors ', this.errors);
            this.body = ErrorSerializer.serializeValidationBodyErrors(this.errors);
            this.status = 400;
            return;
        }
        yield next;

    }

    static * getBydId(next){
        logger.debug('Validate get user by id');
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
