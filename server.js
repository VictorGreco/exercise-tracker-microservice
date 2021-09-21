require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const { json, urlencoded } = require('body-parser')
const mongoose = require('mongoose')
const { Schema } = mongoose;

const userSchema = new Schema({
	username: {
		type: String,
		required: true
	}
})

const responseSchema = new Schema({
	path: String,
	params: Object,
	body: Object,
	query: Object,
	method: String,
	response: Object
})

const logSchema = new Schema({
	path: String,
	params: Object,
	body: Object,
	query: Object,
	method: String,
	status: String,
	message: String
})

const exerciseSchema = new Schema({
	userId: {
		type: Schema.ObjectId,
		required: true
	},
	username: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	duration: {
		type: Number,
		required: true
	},
	date: {
		type: String,
		required: true
	}
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)
const Log = mongoose.model('Log', logSchema)
const Response = mongoose.model('Response', responseSchema)

const handleException = async (req, res, message) => {
	const PARSED_MESSAGE = message

	const errorLog = new Log({
		path: req.path,
		params: req.params,
		body: req.body,
		query: req.query,
		method: req.method,
		message: PARSED_MESSAGE
	})

	await errorLog.save()

	return res.send(PARSED_MESSAGE)
};

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(cors())
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(express.static('public'))

app.use('/api/users/:_id/logs',({ method, url, query, params, body }, res, next) => {
	console.log('>>> ', method, url);
	console.log(' QUERY:', query);
	console.log(' PRAMS:', params);
	console.log('  BODY:', body);
	const _json = res.json;
	res.json = function (data) {
	  console.log(' RESLT:', JSON.stringify(data, null, 2));
	  return _json.call(this, data);
	};
	console.log(' ----------------------------');
	next();
  });

app.get('/', async (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

app.get('/healthcheck', async (req, res) => {
	res.send({ message: 'OK' });
})

app.get('/api/users', async (req, res) => {
	try {
		const allUsers = await User.find().select('_id username');

		res.send(allUsers);
	} catch (error) {
		await handleException(req, res, error.message)
	}
})

app.post('/api/users', async (req, res) => {
	try {
		const { username } = req.body;
		const { _id } = await User.create({ username });

		res.json({ _id, username });
	} catch (error) {
		await handleException(req, res, error.message)
	}
})

app.post('/api/users/:_id/exercises', async (req, res) => {
	try {
		const { _id } = req.params;
		const { description } = req.body;
		const DURATION_INT = parseInt(req.body.duration, 10);
		const REQ_BODY_DATE = new Date(req.body.date);
		const DEFAULT_DATE = new Date().toDateString();
		const DATE_STRING = (!isNaN(REQ_BODY_DATE) && REQ_BODY_DATE.toDateString()) || DEFAULT_DATE;

		const { username } = await User.findById({ _id });
		const { duration, date } = await Exercise.create({
			userId: _id,
			username,
			description,
			duration: DURATION_INT,
			date: DATE_STRING
		});

		res.json({ _id, username, description, duration, date });
	} catch (error) {
		await handleException(req, res, error)
	}
})

app.get('/api/users/:_id/logs', async (req, res) => {
	try {
		const { _id } = req.params;
		const FROM_DATE = new Date(req.query.from)
		const TO_DATE = new Date(req.query.to)
		const FROM_TIMESTAMP = !isNaN(FROM_DATE) && FROM_DATE.getTime()
		const TO_TIMESTAMP = !isNaN(TO_DATE) && TO_DATE.getTime()
		const LIMIT_INT = parseInt(req.query.limit, 10)
		const FIND_OPTIONS = { userId: _id }
		const SELECT_OPTIONS = { _id: 0, duration: 1, date: 1, description: 1 }

		const { username } = await User.findById({ _id })

		const filterByDateRange = ({ date }) =>
			new Date(date).getTime() >= FROM_TIMESTAMP && new Date(date).getTime() <= TO_TIMESTAMP

		let log;

		if (FROM_TIMESTAMP && TO_TIMESTAMP && !!LIMIT_INT && LIMIT_INT > 0) {
			log = await Exercise
				.find(FIND_OPTIONS)
				.select(SELECT_OPTIONS)
				.limit(LIMIT_INT)

			log = log.filter(filterByDateRange)

		} else if (FROM_TIMESTAMP && TO_TIMESTAMP && !LIMIT_INT) {
			log = await Exercise
				.find(FIND_OPTIONS)
				.select(SELECT_OPTIONS)

			log = log.filter(filterByDateRange)

		} else if (!FROM_TIMESTAMP && !TO_TIMESTAMP && !!LIMIT_INT && LIMIT_INT > 0) {
			log = await Exercise
				.find(FIND_OPTIONS)
				.select(SELECT_OPTIONS)
				.limit(LIMIT_INT)

		} else {
			log = await Exercise
				.find(FIND_OPTIONS)
				.select(SELECT_OPTIONS)
		}

		const count = log.length

		let baseResponse = { }

		if (FROM_DATE.toDateString() !== 'Invalid Date') {
			baseResponse.from = FROM_DATE.toDateString()
		}

		if (TO_DATE.toDateString() !== 'Invalid Date') {
			baseResponse.to = TO_DATE.toDateString()
		}

		baseResponse = { _id, username, ...baseResponse, count, log }

		await Response.create({
			path: req.path,
			params: req.params,
			body: req.body,
			query: req.query,
			method: req.method,
			response: baseResponse
		})

		res.json(baseResponse)
	} catch (error) {
		await handleException(req, res, error.message)
	}
})

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})

module.exports = {
	app,
	User
};
