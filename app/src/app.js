'use strict';
//load modules
var config = require('config');
var logger = require('logger');
var path = require('path');
var koa = require('koa');
var bodyParser = require('koa-bodyparser');
var koaLogger = require('koa-logger');
var loader = require('loader');
var validate = require('koa-validate');
var mongoose = require('mongoose');
var ErrorSerializer = require('serializers/errorSerializer');
var mongoUri = process.env.MONGOLAB_URI || 'mongodb://' + config.get('mongodb.host') + ':' + config.get('mongodb.port') + '/' + config.get('mongodb.database');

var onDbReady = function(err) {
    if (err) {
        logger.error(err);
        throw new Error(err);
    }

    // instance of koa
    var app = koa();

    //if environment is dev then load koa-logger
    if (process.env.NODE_ENV === 'dev') {
        app.use(koaLogger());
    }

    app.use(bodyParser({
        jsonLimit: '50mb'
    }));

    //catch errors and send in jsonapi standard. Always return vnd.api+json
    app.use(function*(next) {
        try {
            yield next;
        } catch (err) {
            this.status = err.status || 500;
            this.body = ErrorSerializer.serializeError(this.status, err.message);
            if (process.env.NODE_ENV === 'prod' && this.status === 500) {
                this.body = 'Unexpected error';
            }
        }
        this.response.type = 'application/vnd.api+json';
    });

    //load custom validator
    app.use(validate());

    //load routes
    loader.loadRoutes(app);

    //Instance of http module
    var server = require('http').Server(app.callback());

    // get port of environment, if not exist obtain of the config.
    // In production environment, the port must be declared in environment variable
    var port = process.env.PORT || config.get('service.port');

    server.listen(port, function() {
        require('registerService')();
    });

    logger.info('Server started in port:' + port);

};

mongoose.connect(mongoUri, onDbReady);