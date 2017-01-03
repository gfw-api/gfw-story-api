'use strict';
var logger = require('logger');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const ctRegisterMicroservice = require('ct-register-microservice-node')
;
Mustache.escapeHtml = function (text) { return text; };

const SELECT_SQL = `SELECT 
                ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details, email, created_at, name, title, visible, date, location, cartodb_id as id, media, user_id, hide_user 
                FROM {{{table}}}  
                WHERE visible=true 
                {{#geojson}} AND ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), the_geom) {{/geojson}}
                {{#period}} AND date >= '{{period.begin}}'::date AND date <= '{{period.end}}'::date {{/period}}
                ORDER BY date ASC`;
const SELECT_SQL_BY_ID_OR_USERID = 'SELECT ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details, email, created_at, name, title, visible, date, location, cartodb_id as id, media, user_id, hide_user FROM {{{table}}}  {{#id}} WHERE cartodb_id = {{{id}}} {{/id}} {{#userId}} WHERE user_id = \'{{{userId}}}\' {{/userId}} ORDER BY date ASC';
const DELETE_SQL = 'DELETE FROM {{{table}}} WHERE cartodb_id = {{{id}}}';
const INSERT_SQL = `
    INSERT INTO {{{table}}} (
      name, details, title, visible, location, email, date, user_id,
      media, the_geom, hide_user
    ) VALUES (
      {{{name}}}, {{{details}}}, {{{title}}}, {{{visible}}},
      {{{location}}}, {{{email}}}, {{{date}}}, {{{userId}}},
      {{{media}}}, ST_SetSRID(ST_GeomFromGeoJSON({{{theGeom}}}), 4326), {{{hideUser}}}
    ) RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details,
      email, created_at, name, title, visible, date, location, cartodb_id
      as id, media, user_id, hide_user`;
const UPDATE_SQL = `
    UPDATE {{{table}}} SET name = {{{name}}}, details = {{{details}}}, title = {{{title}}}, visible = {{{visible}}}, location = {{{location}}},
                 email = {{{email}}}, date = {{{date}}}, media =  {{{media}}}, the_geom = ST_SetSRID(ST_GeomFromGeoJSON({{{theGeom}}}), 4326), hide_user = {{{hideUser}}} WHERE cartodb_id = {{cartodbId}} and user_id = {{{userId}}}
    RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details,
      email, created_at, name, title, visible, date, location, cartodb_id
      as id, media, user_id, hide_user`;

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

var deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

function wrapQuotes(text, isEscape){
    return `'${isEscape && text && text.replace ? text.replace(/'/g, '\'\''): text}'`;
}

class CartoDBService {

    constructor(){
        this.client = new CartoDB.SQL({user:config.get('cartoDB.user'), api_key:config.get('cartoDB.apiKey')});
    }

    * createStory(story){
        var params = {
            name: story.name ? wrapQuotes(story.name, true): 'null',
            details: story.details ? wrapQuotes(story.details, true) : 'null',
            title: story.title ? wrapQuotes(story.title, true): 'null',
            visible: story.visible ? wrapQuotes(story.visible, true) : false,
            location: story.location ? wrapQuotes(story.location, true) : 'null',
            email: story.email ? wrapQuotes(story.email, true) : 'null',
            date: story.date ? wrapQuotes(story.date, true) : 'null',
            userId: story.userId ? wrapQuotes(story.userId, true) : 'null',
            media: story.media ? wrapQuotes(JSON.stringify(story.media), false) : 'null',
            hideUser: story.hideUser ? story.hideUser : false,
            theGeom: wrapQuotes(JSON.stringify(story.geojson), false),
            table: config.get('cartoDB.table')
        };

        let data = yield executeThunk(this.client, INSERT_SQL, params);

        return data.rows[0];
    }

    * updateStory(id, story){
        var params = {
            name: story.name ? wrapQuotes(story.name, true): 'null',
            details: story.details ? wrapQuotes(story.details, true) : 'null',
            title: story.title ? wrapQuotes(story.title, true): 'null',
            visible: story.visible ? wrapQuotes(story.visible, true) : false,
            location: story.location ? wrapQuotes(story.location, true) : 'null',
            email: story.email ? wrapQuotes(story.email, true) : 'null',
            date: story.date ? wrapQuotes(story.date, true) : 'null',
            userId: story.userId ? wrapQuotes(story.userId, true) : 'null',
            media: story.media ? wrapQuotes(JSON.stringify(story.media), false) : 'null',
            hideUser: story.hideUser ? story.hideUser : false,
            theGeom: wrapQuotes(JSON.stringify(story.geojson), false),
            cartodbId: id,
            table: config.get('cartoDB.table')
        };

        let data = yield executeThunk(this.client, UPDATE_SQL, params);

        return data.rows[0];
    }

    * getGeojson(path){
        let result = yield ctRegisterMicroservice.requestToMicroservice({
            uri: path,
            method: 'GET',
            json: true
        });
        let geostore = yield deserializer(result);
        if (geostore.geojson) {
            return geostore.geojson.features[0].geometry;
        } else {
            throw new Error('Geostore not found');  
        }
    }

    * getStories(filters){
        let geojson = null;
        if (filters.iso) {
            if (!filters.id1) {
                geojson = yield this.getGeojson(`/geostore/admin/${filters.iso}`);
            } else {
                geojson = yield this.getGeojson(`/geostore/admin/${filters.iso}/${filters.id1}`);
            }            
        } else if (filters.wdpaid) {
            geojson = yield this.getGeojson(`/geostore/wdpa/${filters.wdpaid}`);
        } else if (filters.use) {
            geojson = yield this.getGeojson(`/geostore/use/${filters.use}/${filters.useid}`);
        } else if (filters.geostore) {
            geojson = yield this.getGeojson(`/geostore/${filters.geostore}`);
        }
        if (geojson) {
            geojson = JSON.stringify(geojson);
        }
        let period = null;
        if (filters.period) {
            let parts = filters.period.split(',');
            period = {
                begin: parts[0],
                end: parts[1]
            };
        }

        let data = yield executeThunk(this.client, SELECT_SQL, {table: config.get('cartoDB.table'), geojson, period});
        return data.rows;
    }

    * getStoryById(id){
        let data = yield executeThunk(this.client, SELECT_SQL_BY_ID_OR_USERID, {table: config.get('cartoDB.table'), id: id});
        if(data && data.rows && data.rows.length === 1){
            return data.rows[0];
        }
        return null;
    }

    * getStoriesByUser(user_id){
        let data = yield executeThunk(this.client, SELECT_SQL_BY_ID_OR_USERID, {table: config.get('cartoDB.table'), userId: user_id});
        if(data && data.rows && data.rows.length > 0){
            return data.rows;
        }
        return null;
    }

    * deleteStoryById(id) {
        let data = yield executeThunk(this.client, DELETE_SQL, {table: config.get('cartoDB.table'), id: id});
        if(data && data.rows && data.rows.length > 0){
            return data.rows;
        }
        return null;
    }
}

module.exports = new CartoDBService();
