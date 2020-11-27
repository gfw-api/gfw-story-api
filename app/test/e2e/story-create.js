const nock = require('nock');
const chai = require('chai');
const config = require('config');
const Story = require('models/story.model');
const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

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
        nock(`https://${config.get('cartoDB.user')}.cartodb.com`, { encodedQueryParams: true })
            .post('/api/v2/sql', `q=%0A%20%20%20%20INSERT%20INTO%20gfw_stories_staging%20%28%0A%20%20%20%20%20%20name%2C%20details%2C%20title%2C%20visible%2C%20location%2C%20email%2C%20date%2C%20user_id%2C%0A%20%20%20%20%20%20media%2C%20the_geom%2C%20hide_user%0A%20%20%20%20%29%20VALUES%20%28%0A%20%20%20%20%20%20null%2C%20null%2C%20null%2C%20false%2C%0A%20%20%20%20%20%20null%2C%20null%2C%20null%2C%20null%2C%0A%20%20%20%20%20%20null%2C%20ST_SetSRID%28ST_GeomFromGeoJSON%28%27undefined%27%29%2C%204326%29%2C%20false%0A%20%20%20%20%29%20RETURNING%20ST_Y%28the_geom%29%20AS%20lat%2C%20ST_X%28the_geom%29%20AS%20lng%2C%20details%2C%0A%20%20%20%20%20%20email%2C%20created_at%2C%20name%2C%20title%2C%20visible%2C%20date%2C%20location%2C%20cartodb_id%0A%20%20%20%20%20%20as%20id%2C%20media%2C%20user_id%2C%20hide_user&api_key=${config.get('cartoDB.apiKey')}`)
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
                    user_id: '5dbadb0adf2dc74d2ad05dfb',
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

        const response = await requester
            .post('/api/v1/story');

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
                media: [
                    {
                        order: 0,
                        previewUrl: '14721253102146a8c7ea386c528d2e90193f3f69d8e29nature_4.jpg'
                    },
                    {
                        order: 2,
                        previewUrl: '147212530713536f9f59b55ca98097ed3a3e2c220220cnature_3.jpg'
                    },
                    {
                        order: 3,
                        previewUrl: '14721253134877fd92494f7a0630ba37651dbc8c4bcf1nature_1.jpg'
                    },
                    {
                        embedUrl: 'youtube.com/watch?v=RtcrS7dmhcI',
                        order: 1
                    }
                ],
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
