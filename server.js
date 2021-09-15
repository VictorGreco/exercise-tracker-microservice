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

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })


app.use(cors())
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(express.static('public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async(req, res) => {
	const allUsers = await User.find().select('_id username');

	res.send(allUsers);
})

app.post('/api/users', async(req, res) => {
	const { username } = req.body;
	const newUser = new User({ username });
	const savedUser = await newUser.save();

	res.json({ username: savedUser.username, _id: savedUser._id });
})

app.post('/api/users/:_id/exercises', async(req, res) => {
		const { _id } = req.params;
		const { description, duration, date='' } = req.body;

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
})

app.get('/api/users/:_id/logs', async(req, res) => {
	const { _id } = req.params;

	const exercisesByUserId = await Exercise.find({ userId: _id });


	if (exercisesByUserId.length > 0) {
		const username = exercisesByUserId[0].username;
		const reducedExercisesFields = exercisesByUserId.map(({ description, duration, date }) => ({ description, duration, date }) );

		res.json({
			username,
			count: exercisesByUserId.length,
			_id,
			log: reducedExercisesFields
		})
	}
})

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})
