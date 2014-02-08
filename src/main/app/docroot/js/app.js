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
        .state('my-demos', {
            abstract : true,
            url : '/users/:username/all/demos',
            templateUrl : 'partials/my-demos.html',
            controller : MyDemosCtrl})
        .state('my-demos.index', {
            url : '',
            templateUrl : 'partials/my-demos-index.html',})
        .state('my-demos.demo', {
            url : '/:demo',
            templateUrl : 'partials/my-demo.html',
            controller : MyDemoCtrl})
        .state('public-demos', {
            abstract : true,
            url : '/demos?search&label',
            templateUrl : 'partials/public-demos.html',
            controller : PublicDemosCtrl})
        .state('public-demos.index', {
            url : '',
            templateUrl : 'partials/public-demos-index.html',})
        .state('public-demos.search', {
            url : '/search',
            templateUrl : 'partials/public-demos-search-form.html',
            controller : SearchCtrl})
        .state('public-demos.demo', {
            url : '/:demo',
            templateUrl : 'partials/public-demo.html',
            controller : PublicDemoCtrl})
        .state('snippets', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('videos', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('presentations', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('kicks', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('recommended-reading', {
            url : '/snippets',
            templateUrl : 'partials/under-construction.html'})
        .state('documents', {
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



app.controller('MainCtrl', [ 'HyperMediaService', '$state', '$scope', 'ErrorService', 'AuthorizationService', function( HyperMediaService, $state, $scope, ErrorService, AuthorizationService) {
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
            return HyperMediaService.findData(user, 'firstName') + ' ' + HyperMediaService.findData(user, 'lastName');
        }
    };
    
    $scope.username = function() {
        var user = AuthorizationService.getUser();
        return HyperMediaService.findData(user, 'username');
    }
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
