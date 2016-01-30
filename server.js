var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    hbs = require('hbs'),
    mongoose = require('mongoose'),
    auth = require('./resources/auth');

// require and load dotenv
require('dotenv').load();

// configure bodyParser (for receiving form data)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// serve static files from public folder
app.use(express.static(__dirname + '/public'));

// set view engine to hbs (handlebars)
app.set('view engine', 'hbs');

// connect to mongodb
mongoose.connect('mongodb://localhost/todo');

// require User model
var User = require('./models/user');
var Task = require('./models/task');
var Subtask = require('./models/subtask');

app.listen(3000, function() {
  console.log('server started');
});

/* 


    auth routs 

*/

app.post('/auth/signup', function (req, res) {
  User.findOne({ email: req.body.email }, function (err, existingUser) {
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken.' });
    }
    var user = new User({
      displayName: req.body.displayName,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function (err, result) {
      if (err) {
        res.status(500).send({ message: err.message });
      }
      res.send({ token: auth.createJWT(result) });
    });
  });
});

app.post('/auth/login', function (req, res) {
  User.findOne({ email: req.body.email }, '+password', function (err, user) {
    if (!user) {
      return res.status(401).send({ message: 'Invalid email or password.' });
    }
    user.comparePassword(req.body.password, function (err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ message: 'Invalid email or password.' });
      }
      res.send({ token: auth.createJWT(user) });
    });
  });
});

app.get('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    res.send(user);
  });
});

app.put('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User not found.' });
    }
    user.displayName = req.body.displayName || user.displayName;
    user.email = req.body.email || user.email;
    user.save(function(err) {
      res.status(200).end();
    });
  });
});

/* 


    api routs */


/* 


    task CRUD routs */

//get all tasks of a user
app.get('/api/tasks', auth.ensureAuthenticated, function(req,res){
  User.findById(req.user).populate("tasks").exec(function(err, user){
    console.log("sending" + user);
    res.json(user.tasks);
  });
});

//save a new task
app.post('/api/tasks', auth.ensureAuthenticated, function(req, res){
    User.findById(req.user, function(err, user){
      var task =  new Task({
      name: req.body.name
      });
      task.save(function(err, savedTask){
        console.log("saving " + savedTask);
        user.tasks.push(savedTask);
        console.log(user.tasks);
        user.save();
        res.json(savedTask);
      });
  });
});

//get one task
app.get('/api/tasks/:id', function(req,res){
  taskId = req.params.id;
  Task.findOne({_id:taskId}, function(err, task){
    console.log(task);
    res.json(task);
  });
});

//delete a task
app.delete('/api/tasks/:id', function(req, res){
  taskId = req.params.id;
  Task.remove({_id:taskId}, function(err, deletedTask){
    console.log(deletedTask);
    res.json(deletedTask);
  });
});

//update a task name. didn't user update because it updating the db and returns the old version of the object
app.put('/api/tasks/:id', function(req, res){
  taskId = req.params.id;
  Task.findById(taskId, function(err, foundTask){
    foundTask.name = req.body.name || foundTask.name;
    foundTask.save(function(err, savedUpdatedTask){
      console.log(savedUpdatedTask);
      res.json(savedUpdatedTask);
    });
  });
});

/* 


    subTask CRUD routs 

  */

//save a new subtask
app.post('/api/tasks/:taskId/subtasks', function(req, res){
  taskId = req.params.taskId;
  Task.findById(taskId, function(err, foundTask){
    var subtask =  new Subtask({
      name: req.body.name
    });
    foundTask.subtasks.push(subtask);
    foundTask.save(function(err, savedTask){
      console.log("saving: " + savedTask);
      res.json(savedTask);
    });
  });
});

//delete subtask
app.delete('/api/tasks/:taskId/subtasks/:id', function(req, res){
  taskId = req.params.taskId;
  subtaskId = req.params.id;
  Task.findById(taskId, function(err, foundTask){
    var foundSubTask = foundTask.subtasks.id(subtaskId); 
    console.log("found Subtask: " + foundSubTask);
    foundSubTask.remove();
    foundTask.save(function(err, savedTask){
      console.log("deleted: " + savedTask);
       res.json(savedTask);
    });
  });
});

//update subtask
app.put('/api/tasks/:taskId/subtasks/:id', function(req, res){
  taskId = req.params.taskId;
  subtaskId = req.params.id;
  Task.findById(taskId, function(err, foundTask){
    console.log(foundTask);
    var foundSubTask = foundTask.subtasks.id(subtaskId); 
    foundSubTask.name = req.body.name || foundSubTask.name;
    foundSubTask.completed = req.body.completed || foundSubTask.completed;
    foundTask.save(function(err, savedTask){
       console.log(err);
       res.json(foundSubTask);

    });
  });
});



//catch all routes
app.get('*', function (req, res) {
  res.render('index');
});
