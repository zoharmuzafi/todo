var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var subtaskSchema = new Schema({
	name:{type: String, required: true},
	completed: boolean
});

var Subtask = mongoose.model('Subtask', SubtaskSchema);
module.exports = Subtask;