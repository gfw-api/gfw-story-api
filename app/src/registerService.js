'use strict';
var config = require('config');
var logger = require('logger');
var request = require('co-request');
var url = require('url');
var co = require('co');
var slug = require('slug');
var apiGatewayUri = config.get('apiGateway.uri');
var yaml = require('yaml-js');
var fs = require('fs');

var unregisterDone = false;

var unregister = function* () {
    if(!unregisterDone){
        logger.info('Unregistering service ', config.get('service.id'));
        try {
            let result = yield request({
                uri: apiGatewayUri + '/' + config.get('service.id'),
                method: 'DELETE'
            });
            if(result.statusCode !== 200) {
                logger.error('Error unregistering service');
                process.exit();
            }
            unregisterDone = true;
            logger.info('Unregister service correct!');
            process.exit();
        } catch(e) {
            logger.error('Error unregistering service');
            process.exit();
        }
    }
};

var exitHandler = function (signal) {
    logger.error('Signal', signal);
    // process.exit();
    co(function* () {
        yield unregister();
    });
};

var loadRegisterFile = function(){
    var registerData = JSON.stringify(require('register.json'));
    return JSON.parse(registerData.replace(/#\(service.id\)/g, config.get('service.id'))
        .replace(/#\(service.name\)/g, config.get('service.name'))
        .replace(/#\(service.uri\)/g, config.get('service.uri')));
};
var loadPublicSwagger = function(){
    return yaml.load(fs.readFileSync(__dirname + '/../public-swagger.yml').toString());
};

var register = function () {
    var pack = require('../../package.json');
    co(function* () {
        if(process.env.SELF_REGISTRY) {
            logger.info('Registering service in API Gateway...');
            let serviceConfig = loadRegisterFile();
            serviceConfig.swagger = loadPublicSwagger();
            logger.debug(serviceConfig);
            try {

                let result = yield request({
                    uri: apiGatewayUri,
                    method: 'POST',
                    json: true,
                    body: serviceConfig
                });

                if(result.statusCode !== 200) {
                    logger.error('Error registering service:', result);
                    process.exit();
                }

                logger.info('Register service in API Gateway correct!');
                process.on('exit', exitHandler.bind(this, 'exit'));
                process.on('SIGINT', exitHandler.bind(this, 'SIGINT'));
                process.on('SIGTERM', exitHandler.bind(this, 'SIGTERM'));
                // process.on('SIGKILL', exitHandler.bind(this, 'SIGKILL'));
                process.on('uncaughtException', exitHandler.bind(this, 'uncaughtException'));

            } catch(e) {
                logger.error('Error registering service2', e);
                process.exit();
            }
        }
    });

};

module.exports = register;
