
const assert = require('assert');
const request = require('supertest');
const { app, User } = require('../server');


describe('Test Exercise Tracker Microservice', () => {

    describe('GET /healthcheck', () => {
        it('should return 200 with message OK', (done) => {
            request(app)
                .get('/healthcheck')
                .expect(200)
                .end((err, res) => {
                    assert.equal(res.body.message, 'OK');
                    done();
                })
        })
    });

    describe('POST /api/users', () => {
        it('should return user object with _id and username', (done) => {
            const USERNAME_TEST = 'USERNAME_TEST'
            const MOCKED_USER_DATA = { username: USERNAME_TEST }

            request(app)
                .post('/api/users')
                .send(MOCKED_USER_DATA)
                .expect(200)
                .end((err, res) => {
                    assert.equal(res.body.username, USERNAME_TEST)
                    assert.equal(typeof res.body.username, 'string')
                    assert.equal(typeof res.body._id, 'string')
                    assert.equal(Object.keys(res.body).length, 2)

                    done();
                })
        })

        it('should fail if username is not provided by form', (done) => {
            const MOCKED_USER_DATA = {}
            const EXPECTED_ERROR_MESSAGE = 'Path `username` is required.'

            request(app)
                .post('/api/users')
                .send(MOCKED_USER_DATA)
                .expect(200)
                .end((err, res) => {
                    assert.equal(res.text, EXPECTED_ERROR_MESSAGE)

                    done();
                })
        })
    })

    describe('GET /api/users', () => {
        it('should return an array of users', (done) => {
            request(app)
                .get('/api/users')
                .expect(200)
                .end((err, res) => {
                    assert.equal(Array.isArray(res.body), true)

                    done()
                })
        })

        it('should return users with only _id and username keys', (done) => {
            request(app)
                .get('/api/users')
                .expect(200)
                .end((err, res) => {
                    const result = res.body.every(item => item._id && item.username && Object.keys(item).length === 2)
                    assert.equal(result, true)

                    done()
                })
        })
    })

    describe('POST /api/users/:_id/exercises', () => {

        it('should return user enhanced with description, duration and default date', async () => {
            const MOCK_DESCRIPTION = 'MOCK_DESCRIPTION'
            const MOCK_DURATION = 10
            const MOCK_EXERCISE_DATA = { description: MOCK_DESCRIPTION, duration: MOCK_DURATION }
            const { _id, username } = await User.findOne();
            const MOCKED_DATE = new Date().toDateString();

            request(app)
                .post(`/api/users/${_id}/exercises`)
                .send(MOCK_EXERCISE_DATA)
                .expect(200)
                .end((err, res) => {

                    assert.equal(res.body._id, _id)
                    assert.equal(res.body.username, username)
                    assert.equal(res.body.description, MOCK_DESCRIPTION)
                    assert.equal(res.body.duration, MOCK_DURATION)
                    assert.equal(res.body.date, MOCKED_DATE)
                })
        })

        it('should return user enhanced with description, duration and custom date', async () => {
            const MOCK_DESCRIPTION = 'MOCK_DESCRIPTION'
            const MOCK_DURATION = 10
            const MOCKED_DATE = '2021-09-20'
            const MOCKED_PARSED_DATE = new Date(MOCKED_DATE).toDateString();

            const MOCK_EXERCISE_DATA = { description: MOCK_DESCRIPTION, duration: MOCK_DURATION, date: MOCKED_DATE }
            const { _id, username } = await User.findOne();

            request(app)
                .post(`/api/users/${_id}/exercises`)
                .send(MOCK_EXERCISE_DATA)
                .expect(200)
                .end((err, res) => {

                    assert.equal(res.body._id, _id)
                    assert.equal(res.body.username, username)
                    assert.equal(res.body.description, MOCK_DESCRIPTION)
                    assert.equal(res.body.duration, MOCK_DURATION)
                    assert.equal(res.body.date, MOCKED_PARSED_DATE)
                })
        })

        it('should fail with description message if description and duration are missing', async () => {
            const EXPECTED_ERROR_MESSAGE = 'Path `description` is required.';
            const MOCKED_DATE = '2021-09-20'
            const MOCK_EXERCISE_DATA = { date: MOCKED_DATE }
            const { _id, username } = await User.findOne();

            request(app)
                .post(`/api/users/${_id}/exercises`)
                .send(MOCK_EXERCISE_DATA)
                .expect(200)
                .end((err, res) => {
                    assert.equal(res.text, EXPECTED_ERROR_MESSAGE)
                })
        })


        it('should fail with duration message if only duration is missing', async () => {
            const EXPECTED_ERROR_MESSAGE = 'Path `duration` is required.'
            const MOCKED_DATE = '2021-09-20'
            const MOCK_DESCRIPTION = 'MOCK_DESCRIPTION'
            const MOCK_EXERCISE_DATA = { description: MOCK_DESCRIPTION, date: MOCKED_DATE }
            const { _id, username } = await User.findOne();

            request(app)
                .post(`/api/users/${_id}/exercises`)
                .send(MOCK_EXERCISE_DATA)
                .expect(200)
                .end((err, res) => {
                    assert.equal(res.text, EXPECTED_ERROR_MESSAGE)
                })
        })
    })

    describe('GET /api/users/:_id/logs', () => {

        it('should return a full log of users exercises', async () => {
            const { _id, username } = await User.findOne();

            request(app)
                .get(`/api/users/${_id}/logs`)
                .expect(200)
                .end((err, res) => {
                    const everyLogIsCorrect = res.body.log.every(item =>
                        item.description &&
                        typeof item.description === 'string' &&
                        item.description &&
                        typeof item.duration === 'number' &&
                        item.date &&
                        typeof item.date === 'string' &&
                        Object.keys(item).length === 3
                    )

                    assert.equal(res.body._id, _id)
                    assert.equal(res.body.username, username)
                    assert.equal(res.body.count, res.body.log.length)
                    assert.equal(Object.keys(res.body).length, 4)
                    assert.equal(Array.isArray(res.body.log), true)
                    assert.equal(everyLogIsCorrect, true)
                })
        })

        it('should return a reduced log of users exercises by applying the query parmas', async () => {
            const { _id, username } = await User.findOne();
            const MOCK_FROM = '2021-09-19';
            const MOCK_TO = '2021-09-20';
            const MOCK_LIMIT = 2;
            const FROM_DATE_PARSED = new Date(MOCK_FROM).toDateString();
            const TO_DATE_PARSED = new Date(MOCK_TO).toDateString();

            request(app)
                .get(`/api/users/${_id}/logs?from=${MOCK_FROM}&to=${MOCK_TO}&limit=${MOCK_LIMIT}`)
                .expect(200)
                .end((err, res) => {
                    const everyLogIsCorrect = res.body.log.every(item => 
                        item.date === FROM_DATE_PARSED || 
                        item.date === TO_DATE_PARSED)

                    assert.equal(res.body._id, _id)
                    assert.equal(res.body.username, username)
                    assert.equal(res.body.count, res.body.log.length)
                    assert.equal(res.body.count, MOCK_LIMIT)

                    assert.equal(everyLogIsCorrect, true)
                })
        })
    })
});