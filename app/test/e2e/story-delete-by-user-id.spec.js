const nock = require('nock');
const chai = require('chai');
// const config = require('config');
const Story = require('models/story.model');
const { USERS } = require('./utils/test.constants');
const { getTestServer } = require('./utils/test-server');
const { mockGetUserFromToken } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete stories by user id', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Story.remove({}).exec();
    });

    it('Deleting a story by user Id without being logged should return a 401 Unauthorized', async () => {
        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`);

        response.status.should.equal(401);
    });

    it('Deleting a story by user Id without being logged should return a 403 Forbidden', async () => {
        mockGetUserFromToken(USERS.MANAGER);

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(403);
    });

    it('Delete story by userId as ADMIN should return all stories deleted and a 200 status', async () => {
        mockGetUserFromToken(USERS.ADMIN);

        //     nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
        //         .post('/api/v2/sql', {
        //             q: `
        // INSERT INTO ${config.get('cartoDB.table')} (
        //   name, details, title, visible, location, email, date, user_id,
        //   media, the_geom, hide_user
        // ) VALUES (
        //   null, null, null, false,
        //   null, null, null, '${USERS.USER.id}',
        //   null, ST_SetSRID(ST_GeomFromGeoJSON('undefined'), 4326), false
        // ) RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details,
        //   email, created_at, name, title, visible, date, location, cartodb_id
        //   as id, media, user_id, hide_user`,
        //             api_key: config.get('cartoDB.apiKey'),
        //             format: 'json'
        //         })
        //         .reply(200, {
        //             rows: [{
        //                 lat: 20.12345,
        //                 lng: -48.23456,
        //                 details: 'story details',
        //                 email: null,
        //                 created_at: '2020-11-27T07:21:19Z',
        //                 name: null,
        //                 title: 'story title',
        //                 visible: false,
        //                 date: '2020-01-01T00:00:00Z',
        //                 location: 'location',
        //                 id: 234,
        //                 media: '[{"previewUrl":"14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg","order":0},{"previewUrl":"147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg","order":2},{"previewUrl":"14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg","order":3},{"embedUrl":"youtube.com/watch?v=RtcrS7dmhcI","order":1}]',
        //                 user_id: '1a10d7c6e0a37126611fd7a7',
        //                 hide_user: true
        //             }],
        //             time: 0.048,
        //             fields: {
        //                 lat: { type: 'number', pgtype: 'float8' },
        //                 lng: { type: 'number', pgtype: 'float8' },
        //                 details: { type: 'string', pgtype: 'text' },
        //                 email: { type: 'string', pgtype: 'text' },
        //                 created_at: { type: 'date', pgtype: 'timestamptz' },
        //                 name: { type: 'string', pgtype: 'text' },
        //                 title: { type: 'string', pgtype: 'text' },
        //                 visible: { type: 'boolean', pgtype: 'bool' },
        //                 date: { type: 'date', pgtype: 'timestamptz' },
        //                 location: { type: 'string', pgtype: 'text' },
        //                 id: { type: 'number', pgtype: 'int4' },
        //                 media: { type: 'string', pgtype: 'text' },
        //                 user_id: { type: 'string', pgtype: 'text' },
        //                 hide_user: { type: 'boolean', pgtype: 'bool' }
        //             },
        //             total_rows: 1
        //         });

        const response = await requester
            .delete(`/api/v1/story/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        // TODO: create some actual stories and validate that they are deleted from db and returned here
        response.body.data.should.have.lengthOf(0);
    });

    afterEach(async () => {
        await Story.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
