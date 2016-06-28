'use strict';
var logger = require('logger');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');
Mustache.escapeHtml = function (text) { return text; };

const SELECT_SQL = 'SELECT ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details, email, created_at, name, title, visible, date, location, cartodb_id as id, media, user_id FROM {{{table}}} {{#id}} WHERE cartodb_id = {{{id}}} {{/id}} {{#userId}} WHERE user_id = \'{{{userId}}}\' {{/userId}} ORDER BY date ASC';
const INSERT_SQL = 'INSERT INTO {{{table}}} (name, details, title, visible, location, email, date, user_id, media, the_geom) VALUES ({{{name}}}, {{{details}}},{{{title}}}, {{{visible}}}, {{{location}}},{{{email}}}, {{{date}}}, {{{userId}}}, {{{media}}},st_setsrid(ST_GeomFromGeoJSON({{{theGeom}}}),4326))' +
    ' RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details, email, created_at, name, title, visible, date, location, cartodb_id as id, media, user_id';

var executeThunk = function(client, sql, params){
    return function(callback){
        logger.debug(Mustache.render(sql, params));
        client.execute(sql, params).done(function(data){
            callback(null, data);
        }).error(function(err){
            callback(err, null);
        });
    };
};

function wrapQuotes(text){
    return '\'' + text + '\'';
}

class CartoDBService {

    constructor(){
        this.client = new CartoDB.SQL({user:config.get('cartoDB.user'), api_key:config.get('cartoDB.apiKey')});
    }

    * createStory(story){
        var params = {
            name: wrapQuotes(story.name),
            details: story.details ? wrapQuotes(story.details) : null,
            title: wrapQuotes(story.title),
            visible: story.visible ? wrapQuotes(story.visible) : false,
            location: story.location ? wrapQuotes(story.location) : null,
            email: wrapQuotes(story.email),
            date: story.date ? wrapQuotes(story.date) : null,
            userId: story.userId ? wrapQuotes(story.userId) : 'null',
            media: wrapQuotes(JSON.stringify(story.media)),
            theGeom: wrapQuotes(JSON.stringify(story.geojson)),
            table: config.get('cartoDB.table')
        };

        let data = yield executeThunk(this.client, INSERT_SQL, params);

        return data.rows[0];
    }

    * getStories(){
        let data = yield executeThunk(this.client, SELECT_SQL, {table: config.get('cartoDB.table')});
        return data.rows;
    }

    * getStoryById(id){
        let data = yield executeThunk(this.client, SELECT_SQL, {table: config.get('cartoDB.table'), id: id});
        if(data && data.rows && data.rows.length === 1){
            return data.rows[0];
        }
        return null;
    }

    * getStoriesByUser(user_id){
        let data = yield executeThunk(this.client, SELECT_SQL, {table: config.get('cartoDB.table'), userId: user_id});
        if(data && data.rows && data.rows.length > 0){
            return data.rows;
        }
        return null;
    }
}

module.exports = new CartoDBService();
