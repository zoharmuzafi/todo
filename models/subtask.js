var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var SubtaskSchema = new Schema({
	name:{type: String, required: true, minLength: 2, maxLength: 15},
	completed: {type: Boolean, default: false}
});

var Subtask = mongoose.model('Subtask', SubtaskSchema);
module.exports = Subtask;