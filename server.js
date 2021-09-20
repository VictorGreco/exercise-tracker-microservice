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

const handleException = (message) => `Path ${message.split(': Path ')[1] || '`duration` is required.'}`;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })


app.use(cors())
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(express.static('public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

app.get('/healthcheck', (req, res) => {
	res.send({ message: 'OK' });
})

app.get('/api/users', async (req, res) => {
	try {
		const allUsers = await User.find().select('_id username');

		res.send(allUsers);
	} catch (error) {
		res.send(handleException(error.message));
	}

})

app.post('/api/users', async (req, res) => {
	try {
		const { username } = req.body;

		const newUser = new User({ username });
		const savedUser = await newUser.save();

		res.json({ username: savedUser.username, _id: savedUser._id });
	} catch (error) {
		res.send(handleException(error.message));
	}
})

app.post('/api/users/:_id/exercises', async (req, res) => {
	try {
		const { _id } = req.params;
		const { description, duration, date = '' } = req.body;

		const sanitizedDate = date.replaceAll('-', ' ');
		const sanitizedDuration = parseInt(duration, 10);
		const dateOrDefaultDate = date === '' ? new Date().toDateString() : new Date(sanitizedDate).toDateString();

		const user = await User.findById({ _id });
		const newExercise = new Exercise({
			userId: user._id,
			username: user.username,
			description,
			duration: sanitizedDuration,
			date: dateOrDefaultDate
		});

		const savedExercise = await newExercise.save();

		res.json({
			_id: savedExercise.userId,
			username: savedExercise.username,
			description: savedExercise.description,
			duration: savedExercise.duration,
			date: savedExercise.date
		})
	} catch (error) {
		res.send(handleException(error.message));
	}
})

app.get('/api/users/:_id/logs', async (req, res) => {
	try {
		const { _id } = req.params;
		const { from = null, to = null, limit = null } = req.query;

		const sanitizedFromTimestamp = from && new Date(from.replace('-', ' ')).getTime();
		const sanitizedToTimestamp = to && new Date(to.replace('-', ' ')).getTime();

		const userById = await User.findById({ _id });

		let exercisesByUserId;

		const filterFromToDatesCallback = ({ date }) => {
			const dateTimestamp = new Date(date).getTime();

			return dateTimestamp >= sanitizedFromTimestamp && dateTimestamp <= sanitizedToTimestamp;
		}

		if (sanitizedFromTimestamp && sanitizedToTimestamp && limit) {
			exercisesByUserId = await Exercise
				.find({ userId: _id })
				.select({ _id: 0, duration: 1, date: 1, description: 1 })
				.limit(+limit);

			exercisesByUserId = exercisesByUserId.filter(filterFromToDatesCallback)

		} else if (sanitizedFromTimestamp && sanitizedToTimestamp && !limit) {
			exercisesByUserId = await Exercise
				.find({ userId: _id })
				.select({ _id: 0, duration: 1, date: 1, description: 1 });

			exercisesByUserId = exercisesByUserId.filter(filterFromToDatesCallback)

		} else if (!sanitizedFromTimestamp && !sanitizedToTimestamp && limit) {
			exercisesByUserId = await Exercise
				.find({ userId: _id })
				.select({ _id: 0, duration: 1, date: 1, description: 1 })
				.limit(+limit);

		} else if (!sanitizedFromTimestamp && !sanitizedToTimestamp && !limit) {
			exercisesByUserId = await Exercise
				.find({ userId: _id })
				.select({ _id: 0, duration: 1, date: 1, description: 1 });
		}

		const exercisesByUserIdLength = exercisesByUserId.length;

		if (exercisesByUserIdLength > 0) {

			res.json({
				username: userById.username,
				count: exercisesByUserIdLength,
				_id: userById._id,
				log: exercisesByUserId
			})
		}
	} catch (error) {
		res.send(handleException(error.message));
	}
})

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})

module.exports = {
	app,
	User
};
