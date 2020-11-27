const logger = require('logger');
const config = require('config');
const CartoDB = require('cartodb');
const Mustache = require('mustache');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const ctRegisterMicroservice = require('ct-register-microservice-node');

Mustache.escapeHtml = (text) => text;

const SELECT_SQL = `SELECT
                ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details, email, created_at, name, title, visible, date, location, cartodb_id as id, media, user_id, hide_user
                FROM {{{table}}}
                WHERE visible=true
                {{#geojson}} AND ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{{{geojson}}}'), 4326), the_geom) {{/geojson}}
                {{#period}} AND date >= '{{period.begin}}'::date AND date <= '{{period.end}}'::date {{/period}}
                ORDER BY date ASC`;
const SELECT_SQL_BY_ID_OR_USERID = `SELECT ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng,
                details, email, created_at, name, title, visible, date, location, cartodb_id as id,
                media, user_id, hide_user FROM {{{table}}}  {{#id}}
                WHERE cartodb_id = {{{id}}} {{/id}} {{#userId}} WHERE user_id = '{{{userId}}}' {{/userId}} ORDER BY date ASC`;

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
    UPDATE {{{table}}}
    SET name = {{{name}}}, details = {{{details}}}, title = {{{title}}}, visible = {{{visible}}}, location = {{{location}}},
                 email = {{{email}}}, date = {{{date}}}, media =  {{{media}}},
                 the_geom = ST_SetSRID(ST_GeomFromGeoJSON({{{theGeom}}}), 4326), hide_user = {{{hideUser}}} WHERE cartodb_id = {{cartodbId}} and user_id = {{{userId}}}
    RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details,
      email, created_at, name, title, visible, date, location, cartodb_id
      as id, media, user_id, hide_user`;

const executeThunk = async (client, sql, params) => (new Promise((resolve, reject) => {
    logger.debug(Mustache.render(sql, params));
    client.execute(sql, params).done((data) => {
        resolve(data);
    }).error((error) => {
        reject(error);
    });
}));

const deserializer = (obj) => (callback) => {
    new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
};

function wrapQuotes(text, isEscape) {
    return `'${isEscape && text && text.replace ? text.replace(/'/g, '\'\'') : text}'`;
}

class CartoDBService {

    constructor() {
        this.client = new CartoDB.SQL({ user: config.get('cartoDB.user'), api_key: config.get('cartoDB.apiKey') });
    }

    async createStory(story) {
        const params = {
            name: story.name ? wrapQuotes(story.name, true) : 'null',
            details: story.details ? wrapQuotes(story.details, true) : 'null',
            title: story.title ? wrapQuotes(story.title, true) : 'null',
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

        const data = await executeThunk(this.client, INSERT_SQL, params);

        return data.rows[0];
    }

    async updateStory(id, story) {
        const params = {
            name: story.name ? wrapQuotes(story.name, true) : 'null',
            details: story.details ? wrapQuotes(story.details, true) : 'null',
            title: story.title ? wrapQuotes(story.title, true) : 'null',
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

        const data = await executeThunk(this.client, UPDATE_SQL, params);

        return data.rows[0];
    }

    // eslint-disable-next-line class-methods-use-this
    async getGeojson(path) {
        const result = await ctRegisterMicroservice.requestToMicroservice({
            uri: path,
            method: 'GET',
            json: true
        });
        const geostore = await deserializer(result);
        if (geostore.geojson) {
            return geostore.geojson.features[0].geometry;
        }
        throw new Error('Geostore not found');

    }

    async getStories(filters) {
        let geojson = null;
        if (filters.iso) {
            if (!filters.id1) {
                geojson = await this.getGeojson(`/geostore/admin/${filters.iso}`);
            } else {
                geojson = await this.getGeojson(`/geostore/admin/${filters.iso}/${filters.id1}`);
            }
        } else if (filters.wdpaid) {
            geojson = await this.getGeojson(`/geostore/wdpa/${filters.wdpaid}`);
        } else if (filters.use) {
            geojson = await this.getGeojson(`/geostore/use/${filters.use}/${filters.useid}`);
        } else if (filters.geostore) {
            geojson = await this.getGeojson(`/geostore/${filters.geostore}`);
        }
        if (geojson) {
            geojson = JSON.stringify(geojson);
        }
        let period = null;
        if (filters.period) {
            const parts = filters.period.split(',');
            period = {
                begin: parts[0],
                end: parts[1]
            };
        }

        const data = await executeThunk(this.client, SELECT_SQL, {
            table: config.get('cartoDB.table'),
            geojson,
            period
        });
        return data.rows;
    }

    async getStoryById(id) {
        const data = await executeThunk(this.client, SELECT_SQL_BY_ID_OR_USERID, {
            table: config.get('cartoDB.table'),
            id
        });
        if (data && data.rows && data.rows.length === 1) {
            return data.rows[0];
        }
        return null;
    }

    async getStoriesByUser(userId) {
        const data = await executeThunk(this.client, SELECT_SQL_BY_ID_OR_USERID, {
            table: config.get('cartoDB.table'),
            userId
        });
        if (data && data.rows && data.rows.length > 0) {
            return data.rows;
        }
        return null;
    }

    async deleteStoryById(id) {
        const data = await executeThunk(this.client, DELETE_SQL, { table: config.get('cartoDB.table'), id });
        if (data && data.rows && data.rows.length > 0) {
            return data.rows;
        }
        return null;
    }

}

module.exports = new CartoDBService();
