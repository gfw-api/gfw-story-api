const nock = require('nock');
const chai = require('chai');
const config = require('config');
const Story = require('models/story.model');
const { getTestServer } = require('./utils/test-server');
const { USERS } = require('./utils/test.constants');
const { mockValidateRequestWithApiKeyAndUserToken } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create story', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(async () => {
        await Story.remove({}).exec();
    });

    it('Create story (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', {
                q: `
    INSERT INTO ${config.get('cartoDB.table')} (
      name, details, title, visible, location, email, date, user_id,
      media, the_geom, hide_user
    ) VALUES (
      null, null, null, false,
      null, null, null, '${USERS.ADMIN.id}',
      null, ST_SetSRID(ST_GeomFromGeoJSON('undefined'), 4326), false
    ) RETURNING ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng, details,
      email, created_at, name, title, visible, date, location, cartodb_id
      as id, media, user_id, hide_user`,
                api_key: config.get('cartoDB.apiKey'),
                format: 'json'
            })
            .reply(200, {
                rows: [{
                    lat: 20.12345,
                    lng: -48.23456,
                    details: 'story details',
                    email: null,
                    created_at: '2020-11-27T07:21:19Z',
                    name: null,
                    title: 'story title',
                    visible: false,
                    date: '2020-01-01T00:00:00Z',
                    location: 'location',
                    id: 234,
                    media: '[{"previewUrl":"14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg","order":0},{"previewUrl":"147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg","order":2},{"previewUrl":"14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg","order":3},{"embedUrl":"youtube.com/watch?v=RtcrS7dmhcI","order":1}]',
                    user_id: '1a10d7c6e0a37126611fd7a7',
                    hide_user: true
                }],
                time: 0.048,
                fields: {
                    lat: { type: 'number', pgtype: 'float8' },
                    lng: { type: 'number', pgtype: 'float8' },
                    details: { type: 'string', pgtype: 'text' },
                    email: { type: 'string', pgtype: 'text' },
                    created_at: { type: 'date', pgtype: 'timestamptz' },
                    name: { type: 'string', pgtype: 'text' },
                    title: { type: 'string', pgtype: 'text' },
                    visible: { type: 'boolean', pgtype: 'bool' },
                    date: { type: 'date', pgtype: 'timestamptz' },
                    location: { type: 'string', pgtype: 'text' },
                    id: { type: 'number', pgtype: 'int4' },
                    media: { type: 'string', pgtype: 'text' },
                    user_id: { type: 'string', pgtype: 'text' },
                    hide_user: { type: 'boolean', pgtype: 'bool' }
                },
                total_rows: 1
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/user/${USERS.ADMIN.id}`)
            .reply(200, {
                data: {
                    type: 'user', id: USERS.ADMIN.id, attributes: USERS.ADMIN
                }
            });

        const response = await requester
            .post('/api/v1/story')
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.data.should.be.an('object').and.deep.equal({
            attributes: {
                createdAt: '2020-11-27T07:21:19Z',
                date: '2020-01-01T00:00:00Z',
                details: 'story details',
                email: null,
                hideUser: true,
                lat: 20.12345,
                lng: -48.23456,
                location: 'location',
                media: [{
                    order: 0, previewUrl: '14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg'
                }, {
                    order: 2, previewUrl: '147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg'
                }, {
                    order: 3, previewUrl: '14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg'
                }, {
                    embedUrl: 'youtube.com/watch?v=RtcrS7dmhcI', order: 1
                }],
                name: null,
                title: 'story title',
                visible: false,
            },
            id: '234',
            type: 'story'
        });
    });

    afterEach(async () => {
        await Story.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
