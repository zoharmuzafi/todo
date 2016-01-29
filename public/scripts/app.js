var app = angular.module('todoApp', ['ngRoute', 'ngResource', 'satellizer']);

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

//resource for api calls
app.factory('Task', ['$resource', function($resource) {
  return $resource("/api/tasks/:id", {id: "@_id"}, {
    query: {
      isArray: true
    },
    update: {
      methood: "PUT"
    }
  });
}]);

//controllers


//main controller for all the app
app.controller('MainCtrl', ['$scope', '$auth', '$location', '$http', 'Task', function ($scope, $auth, $location, $http, Task) {
  //add the current user to the scope after login/signup
  $scope.isAuthenticated = function() {
    // send GET request to the api
    $http.get('/api/me').then(function(response){
      console.log(response);
      $scope.currentUser = response.data;
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

}]);

//auth controller for login and signup
app.controller('AuthCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  if ($scope.currentUser) {
      $location.path('/profile');
      $scope.user = {};
    }

  //signup
  $scope.signup = function() {
    $auth.signup($scope.user)
    .then(function(response) {
      console.log(response.data.token);
      // set token 
      $auth.setToken(response.data.token);
      // excute isAuthenticated to set currentUser to the scope
      $scope.isAuthenticated();
      // clear signup form
      $scope.user = {};
      // redirect to '/profile'
      $location.path('/profile');
      }, function(err) {
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
        // redirect to '/profile'
          $location.path('/profile');
        }, function(err){
          console.log(err);
        }
        );
    };
}]);

//home controller for homepage (include login and sign up)
app.controller('HomeCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  
}]);

//profile controller
app.controller('ProfileCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
  
  //get all the tasks for a user
  $scope.tasks = Task.query(function(data) {
    console.log(data);
  });
  //add new task
  $scope.newTask = function(){
    Task.save($scope.task, function(data){
      $scope.task={};
      $scope.tasks.push(data);
    }, function(err){
      console.log(err);
    }); 
  };
}]);

//user show controller
app.controller('TasksShowCtrl', ['$scope', '$auth', '$location', '$routeParams', 'Task', function ($scope, $auth, $location, $routeParams,Task) {
  taskId = $routeParams.id;
  console.log(taskId);
  $scope.singleTask = Task.get({id: taskId});
  console.log($scope.singleTask);

  //delete task 
  $scope.deleteTask = function(){
    Task.delete({id:taskId}, function(data){
      console.log(data);
      $location.path('/profile');
    }); 
  };

  //update a task
  $scope.updateTask = function(){
    Task.update({id:taskId}, $scope.editTask, function(data){
      console.log(data);
    });
  };

}]);

//edit profile controller
app.controller('UsersEditCtrl', ['$scope', '$auth', '$location', 'Task', function ($scope, $auth, $location, Task) {
}]);



