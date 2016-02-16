var app = angular.module('todoApp', ['ngRoute', 'ngResource', 'satellizer', 'toastr']);

//routes
app.config(['$routeProvider', '$locationProvider',
  function ($routeProvider, $locationProvider) {
    $routeProvider
    	.when('/', {
        templateUrl: 'templates/landingpage/index.html',
        controller: 'HomeCtrl'
    	})
    	.when('/profile', {
    		templateUrl: 'templates/profile/profile.html',
        controller: 'ProfileCtrl'
    	})
      .when('/login', {
        templateUrl: 'templates/landingpage/login.html',
        controller: 'AuthCtrl'
      })
      .when('/signup', {
        templateUrl: 'templates/landingpage/signup.html',
        controller: 'AuthCtrl'
      })
      .when('/tasks/:id', {
        templateUrl: 'templates/task/show.html',
        controller: 'TasksShowCtrl'
      })
      .when('/edit/:id', {
        templateUrl: 'templates/profile/edit.html',
        controller: 'UsersEditCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });
  }
]);

//resource for task api calls
app.factory('Task', ['$resource', function($resource) {
  return $resource("/api/tasks/:id", {id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//resource for subtasks api calls
app.factory('Subtask', ['$resource', function($resource) {
  return $resource("/api/tasks/:taskId/subtasks/:id", {taskId: "@_id" , id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//resource for user api calls
app.factory('User', ['$resource', function($resource) {
  return $resource("/api/users/:id", {id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      method: "PUT"
    }
  });
}]);

//websocket
app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

//controllers


//main controller for all the app
app.controller('MainCtrl', ['$scope', '$auth', '$location', '$http', 'Task', function ($scope, $auth, $location, $http, Task) {

  // add the current user to the scope after login/signup
  $scope.isAuthenticated = function() {
    // send GET request to the api
    $http.get('/api/me').then(function(response){
      $scope.currentUser = response.data;
      $location.path('/profile');
    }, function(err){
      console.log(err);
      $auth.removeToken();
    });
  };

  $scope.isAuthenticated();

  //logou- remove the token and the current user from the scope
  $scope.logout = function(){
    $auth.removeToken();
    $scope.currentUser = null;
    $location.path('/login');
  };

  //add new task
  $scope.newTask = function(){
    Task.save($scope.task, function(data){
      $scope.task={};
      $scope.tasks.push(data);
      $location.path('/tasks/' + data._id);
    }, function(err){
      console.log(err);
    }); 
  };

  //adding content to the form
  $scope.editUserForm = function(){
    $scope.edituser = $scope.currentUser;
  };
}]);

//auth controller for login and signup
app.controller('AuthCtrl', ['$scope', '$auth', '$location', 'Task', 'toastr', function ($scope, $auth, $location, Task, toastr) {

  //signup
  $scope.signup = function() {

    $auth.signup($scope.user)
    .then(function(response) {
      // set token 
      $auth.setToken(response.data.token);
      // excute isAuthenticated to set currentUser to the scope
      $scope.isAuthenticated();
      // clear signup form
      $scope.user = {};

      }, function(err) {
        toastr.error('Please check that you entered in all the information correctly.', 'Error');
        console.log(err);
    });
  };

  //login 
   $scope.login = function() {
    // login (https://github.com/sahat/satellizer#authloginuser-options)
    $auth.login($scope.user)
      .then(function(response){
      // set token (https://github.com/sahat/satellizer#authsettokentoken)
        $auth.setToken(response.data.token);
      // call $scope.isAuthenticated to set $scope.currentUser
        $scope.isAuthenticated();
      // clear sign up form
        $scope.user = {}; 

      }, function(err){
        console.log(err);
        toastr.error('Email or password is incorrect.', 'Error');
      });
    };
}]);

//home controller for homepage (include login and sign up)
app.controller('HomeCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  if ($scope.currentUser) {
    $location.path('/profile');
    $scope.user = {};
  }  
}]);

//profile controller
app.controller('ProfileCtrl', ['$scope', 'socket', '$auth', '$location', 'Task', '$http', function ($scope, socket, $auth, $location, Task, $http) {
  if(($scope.currentUser===undefined) || ($scope.currentUser===null)){
    $location.path('/');
  }

  //get all the tasks for a user
  $scope.tasks = Task.query();
  
  //add new task
  $scope.newTask = function(){
    Task.save($scope.task, function(data){
      $scope.task={};
      $scope.tasks.push(data);
      $location.path('/tasks/' + data._id);
    }, function(err){
      console.log(err);
    }); 
  };

  //emit the client when task added
  socket.on('addTask', function(task){
    var exist = false;
    for(var i=0; i<$scope.tasks.length; i++){
      if($scope.tasks[i]._id === task._id){
        exist = true;
        i=$scope.tasks.length;
      }
    }
    for(var j=0; j<task.users.length; j++){
      if ((task.users[j]._id === $scope.currentUser._id) && (!exist)){
        $scope.tasks.push(task);
      }
    }
  });

  //emit the client when task deleted
  socket.on('deletedTask', function(deletedTask){
    var indexOfDeletedTask = $scope.tasks.indexOf(deletedTask);
    $scope.tasks.splice(indexOfDeletedTask,1);
  });

  //emit the client if task edited
  socket.on('editedTask', function(editedTask){
    for(var i=0; i < $scope.tasks.length; i++){
      if($scope.tasks[i]._id === editedTask._id){
        $scope.tasks[i] = editedTask;
        return;
      }
    }
  });

  //change subtask counter on profile page when another user add subtask
  socket.on('addSubTask', function(task){
    var taskId = task._id;
    for(var i=0; i<task.users.length; i++){
      if(task.users[i] === $scope.currentUser._id){
        for(var j=0; j<$scope.tasks.length; j++){
          if($scope.tasks[j]._id === taskId){
            $scope.tasks[j].subtasks.push(task.subtasks[task.subtasks.length-1]); 
            return;
          }
        }
      }
    }
  });
}]);

//task show controller
app.controller('TasksShowCtrl', ['$scope', 'socket', '$auth', '$location', '$routeParams', 'Task', 'Subtask', '$http', function ($scope, socket, $auth, $location, $routeParams, Task, Subtask, $http) {
  taskId = $routeParams.id;
  $scope.singleTask = Task.get({id: taskId});

  //delete task 
  $scope.deleteTask = function(){
    Task.delete({id:taskId}, function(data){
      $location.path('/profile');
    }); 
  };

  //update a task
  $scope.updateTask = function(){
    Task.update({id:taskId}, $scope.editTask, function(data){
      $scope.singleTask.name = data.name;
      $scope.editTask = {};
      $scope.showEditTaskForm = false;
    });
  };



  //add subtask to a task
  $scope.addSubTask = function(){
    Subtask.save({taskId: taskId}, $scope.subTask, function(data){
      $scope.subTask = {};
         }, function(err){
        console.log(err);
    });
  };

  //delete subtask
  $scope.deleteSubTask = function(subtask){
    Subtask.delete({taskId: taskId, id: subtask._id}, function(data){
    });
  };

  //update subtask
  $scope.editSubTask = function(subtask){
    indexSubtask = $scope.singleTask.subtasks.indexOf(subtask);
    Subtask.update({taskId: taskId, id: subtask._id}, subtask.subTaskEdit, function(data){
      $scope.singleTask.subtasks[indexSubtask].name = data.name;
      subtask[$scope.showForm] = false;
    });
  };

  //mark subtask as completed 
  $scope.completeSubTask = function(subtask){
    indexSubtask = $scope.singleTask.subtasks.indexOf(subtask);
    if(subtask.completed === true){
      subtask.completed = false;
    }
    else{
      subtask.completed = true;
    } 
    Subtask.update({taskId: taskId, id: subtask._id}, subtask, function(data){ 
      $scope.singleTask.subtasks[indexSubtask].completed = subtask.completed;
    });
  };

  //find a user (share function)
  $scope.search = function(){
    $scope.results = false;
    $scope.noResults = false;
    userEmail = $scope.searchUser;
    $http.get('api/users/email/' + userEmail).then(function(response){
      if(!response.data){
        $scope.foundUser = "user not found";
        $scope.noResults = true;
        return;
      }else{
        for(var i=0; i<$scope.singleTask.users.length; i++){
          if($scope.singleTask.users[i]._id === response.data._id){
            $scope.foundUser = "you already share the task with this person";
            $scope.noResults = true;
            return;
          }  
        }
        $scope.foundUser = response.data;
        $scope.results = true;
      }
    }, function(err){
      console.log(err);
    });
  };

  //share task with a user
  $scope.share = function(user){
    $http.put('api/users/' + user._id +'/task/' + taskId).then(function(data){
      $scope.shareFormShow = false;
    });
  };

  $scope.editSubtaskForm = function(subtask){
    // subtask.subTaskEdit = subtask;
    if(subtask[$scope.showForm] === false){
      subtask[$scope.showForm] = true;
    }
    else{
      subtask[$scope.showForm] = false;
    }
  };
  $scope.editTaskForm = function(){
    if(!$scope.showEditTaskForm){
      $scope.showEditTaskForm = true;
    }
    else{
      $scope.showEditTaskForm = false;
    }
  };
  $scope.shareTaskForm = function(){
    if(!$scope.shareFormShow){
      $scope.shareFormShow = true;
    }
    else{
      $scope.shareFormShow = false;
    }
  };
  

  //emit the client if added a new subtask
  socket.on('addSubTask', function(task){
    if($scope.singleTask._id === task._id){
      $scope.singleTask.subtasks.push(task.subtasks[task.subtasks.length-1]);
    }

  });

  //emit the client if subtask deleted
  socket.on('deletedSubTask', function(deleteSubTask){
    var foundSubTask = $scope.singleTask.subtasks.filter(function(subtask){
      return subtask._id === deleteSubTask._id;
    })[0];
    var indexOfDeletedSubTask= $scope.singleTask.subtasks.indexOf(foundSubTask);
    $scope.singleTask.subtasks.splice(indexOfDeletedSubTask,1);
  });

  //emit the client if subtask edited
  socket.on('editSubTask', function(updatedTask){
     if($scope.singleTask._id === updatedTask._id){
      $scope.singleTask.subtasks = updatedTask.subtasks;
    }
  });

  //emit the client if task deleted
  socket.on('deletedTask', function(deletedTask){
    if($scope.singleTask._id === deletedTask._id){
      $location.path('/profile');
     }
  });

  //emit the client if task edited
  socket.on('editedTask', function(editedTask){
    if($scope.singleTask._id === editedTask._id){
      $scope.singleTask = editedTask;
     }
  });

}]);

//edit profile controller
app.controller('UsersEditCtrl', ['$scope', '$auth', '$location', 'Task', 'User', '$routeParams', 'toastr', function ($scope, $auth, $location, Task, User, $routeParams, toastr) {
  if($routeParams.id !== $scope.currentUser._id){
    $location.path('/profile');
  }
  //update user
  $scope.updateUser = function(){
    User.update({id:$scope.currentUser._id}, $scope.edituser, function(data){
      $scope.currentUser.displayName = data.displayName;
      $scope.currentUser.email = data.email;
      $location.path('/profile');
      toastr.success('Your profile was updated.', 'Updated!');
    },
    function(err){
      toastr.error("Your profile didn't update.", 'Error');
    });  
  };

  //delete user
  $scope.deletUser = function(){
    User.delete({id:$scope.currentUser._id}, function(data){
      $scope.logout();
      $location.path('/');
    });
  };
  
}]);



