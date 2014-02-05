'use strict';

/* App Module */

var app = angular.module('demo-repository', [ 'xeditable', 'ui.router.compat', 'ui.bootstrap', 'ngResource' ]);

//var baseUrl = "https://demo-repository-api.cloudhub.io/";
var baseUrl = "https://solution-repository-api.cloudhub.io/";
app.config([ '$stateProvider', '$routeProvider', '$urlRouterProvider', '$httpProvider', '$provide', function($stateProvider, $routeProvider, $urlRouterProvider, $httpProvider, $provide) {

    $httpProvider.responseInterceptors.push('HttpInterceptorService');

    $urlRouterProvider
         .when('', '/home');

    $stateProvider
        .state('repositories', {
            abstract : true,
            url : '/users/:username/all/demos',
            templateUrl : 'partials/repositories.html',
            controller : RepositoriesCtrl})
        .state('repositories.index', {
            url : '',
            templateUrl : 'partials/repositories-index.html',})
        .state('repositories.repository', {
            url : '/:repository',
            templateUrl : 'partials/repository.html',
            controller : RepositoryCtrl})
        .state('demos', {
            abstract : true,
            url : '/demos?tags&verticals',
            templateUrl : 'partials/demos.html',
            controller : DemosCtrl})
        .state('demos.index', {
            url : '',
            templateUrl : 'partials/demos-index.html',})
        .state('demos.search', {
            url : '/search',
            templateUrl : 'partials/demos-search-form.html',
            controller : SearchCtrl})
        .state('demos.demo', {
            url : '/:demo',
            templateUrl : 'partials/demo.html',
            controller : DemoCtrl})
        .state('gists', {
            url : '/gists',
            templateUrl : 'partials/under-construction.html'})
        .state('snippets', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('login', {
            url : '/login',
            templateUrl : 'partials/login.html',
            controller : LoginCtrl})
        .state('logout', {
            url : '/login',
            templateUrl : 'partials/login.html',
            controller : LoginCtrl})
        .state('home', {
            url : '/home',
            templateUrl : 'partials/home.html'})
} ]);

app.run(['$rootScope', '$state', '$stateParams', function(editableOptions, $rootScope, $state, $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    editableOptions.theme = 'bs2';
} ]);



app.controller('MainCtrl', [ 'CJService', '$state', '$scope', 'ErrorService', 'AuthorizationService', function( CJService, $state, $scope, ErrorService, AuthorizationService) {
    var author = false;
    var targetIndex = 1;
    var targets = [
        {
            label: 'V',
            description: 'Quick Search by Verticals',
            hint: 'insurance, healthcare, etc.',
            suggestions: []
        },
        {
            label: 'T',
            description: 'Quick Search by Tags',
            hint: 'http, jms, etc.',
            suggestions: []
        }
    ];
    $scope.searchCriteria = {
        target: targets[targetIndex % 2],
        text: ''
    };
    $scope.errorService = ErrorService;
    
    $scope.toggleSearchTarget = function() {
        targetIndex++;
        $scope.searchCriteria.target = targets[targetIndex % 2];
        $scope.searchCriteria.text = '';
    };
    $scope.isAuthor = function() {
        return AuthorizationService.isEditor();
    };
    $scope.signedIn = function() {
        return AuthorizationService.hasToken();
    };
    $scope.logout = function() {
        AuthorizationService.logout();
        author = true; // just the default
        $state.go('login');
    };
    $scope.isActive = function(state) {
        return $state.includes(state);
    };
    $scope.welcome = function() {
        if (AuthorizationService.getUser()) {
            var user = AuthorizationService.getUser();
            return CJService.getData(user, 'firstName') + ' ' + CJService.getData(user, 'lastName');
        }
    };
    $scope.search = function() {
        if ($scope.searchCriteria.target.label === 'V') {
            $state.go('demos.index', { verticals : $scope.searchCriteria.text});
        } else {
            $state.go('demos.index', { tags : $scope.searchCriteria.text});
        }
    };
    
    $scope.$on('SignIn', function() {
        /*
        Restangular
            .all('tags')
            .getList({
                q : '.*', 
                limit : 0 })
            .then(function (data) {
                targets[1].suggestions = data.tags;});
        Restangular
            .all('taxonomies')
            .getList({ 
                q: '.*', 
                limit: 10000})
            .then(function (data) {
                targets[0].suggestions = data;});
                author = AuthorizationService.getUser().githubUsername;
                */
                });
         
    $scope.$on('LoginRequired', function() {
        AuthorizationService.logout();
        $state.go('login');});

} ]);
