var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var Subtask = require("./subtask");
var User = require("./user");


var TaskSchema = new Schema({

	name:{type: String, required: true}, 
	completed: {type: Boolean, default: false},
	subtasks: [Subtask.schema],
	users: [{type: Schema.Types.ObjectId, ref: "User"}]
});

var Task = mongoose.model("Task", TaskSchema);
module.exports = Task;