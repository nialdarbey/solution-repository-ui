AppX = Ember.Application.extend({
  LOG_TRANSITIONS: true,
  asrTokenRequestTemplate: 'https://registry-ci.mulesoft.com:443/api/access-token?grant_type=password&client_id=WEBUI&username=USER_NAME&password=PASS_WORD&scope=READ_SERVICES%20WRITE_SERVICES%20 CONSUME_SERVICES%20 APPLY_POLICIES%20READ_CONSUMERS%20WRITE_CONSUMERS%20 CONTRACT_MGMT%20 CONSUME_POLICIES',
  githubUsername: null,
  asrToken: localStorage.asrToken,
  asrTokenChanged: function() {
    var token = this.get('asrToken');
    if (token === null) {
      localStorage.removeItem('asrToken');
    } else {
      localStorage.asrToken = this.get('asrToken');
    }
  }.observes('asrToken'),
  githubUsername: localStorage.githubUsername,
  githubUsernameChanged: function() {
    localStorage.githubUsername = this.get('githubUsername');
  }.observes('githubUsername'),
});

App = AppX.create();


/*

          API

          */

Api = Milo.API.create();

Api.options('baseUrl', 'https://localhost:9999/api');

Api.Demo = Milo.Model.extend({
    rootElement: 'services',
    uriTemplate: '/demos/:id',
    name: Milo.property('string')
});
Api.Repository = Milo.Model.extend({
    rootElement: 'repositories',
    uriTemplate: '/repositories/:repository_id',
    name: Milo.property('string'),
    readMe: Milo.property('string')
    //owner: Milo.property("Api.RepositoryOwner"),
    //createdAt: Milo.property('date')
});
Api.RepositoryReadMe = Milo.Model.extend({
    rootElement: 'readMe',
    uriTemplate: '/repositories/:repository_id/read-me',
    readMe: Milo.property('string')
})
Api.RepositoryOwner = Milo.Model.extend({
    login: Milo.property('string')
});
Api.Snippet = Milo.Model.extend({
    rootElement: 'snippets',
    uriTemplate: '/snippets/:id',
    name: Milo.property('string')
});
Api.Gist = Milo.Model.extend({
    rootElement: 'gists',
    uriTemplate: '/gists/:id',
    name: Milo.property('string')
});
Api.User = Milo.Model.extend({
    rootElement: 'user',
    uriTemplate: '/users/:id',
    firstName: Milo.property('string'),
    lastName: Milo.property('string'),
    role: Milo.property('string'),
    githubUsername: Milo.property('string'),
    fullName: function() {
      var firstName = this.get('firstName');
      var lastName = this.get('lastName');
      return firstName + ' ' + lastName;
    }.property('firstName', 'lastName')
})



/***
          ROUTES
          */

App.Router.map(function() {
  this.route('home');
  this.resource('demos');
  this.resource('repositories', function() {
    this.resource('repository', { path: '/:repository_id' });
  });
  this.resource('snippets');
  this.resource('gists');
  this.resource('login');
});

App.PrivateRoute = Ember.Route.extend({

  redirect: function(controller, context) {
    if (! App.get('asrToken')) {
      this.transitionTo('login');
    }
  },

  // beforeModel hook is only available from version rc 6
  beforeModel: function(transition) { 
    if (! this.controllerFor('login').get('token')) {
      this.redirectToLogin(transition);
    } 
  },

  redirectToLogin: function(transition) {
    var loginController = this.controllerFor('login');
    loginController.set('attemptedTransition', transition);
    this.transitionTo('login');
  },

  events: {
    error: function(reason, transition) {
      if (reason.status === 403) {
        this.redirectToLogin(transition);
      } else {
        alert('Something went wrong');
      }
    }
  }
});
App.IndexRoute = App.PrivateRoute.extend({
  redirect: function() {
    this.transitionTo('repositories');
  }
});
App.LoginRoute = Ember.Route.extend({
  setupController: function(controller, context) {
    controller.reset();
  }
});


App.RepositoriesRoute = App.PrivateRoute.extend({
  model: function() {
    return Api.Repository.where({ owner: App.get('githubUsername')}).findMany();
  }
});
App.RepositoriesIndexRoute = App.PrivateRoute.extend({
  model: function() {
    console.log('RepositoriesIndex Route...');
  }
});
App.RepositoryRoute = App.PrivateRoute.extend({
  model: function(params) {
    console.log("Repository Route...  ");
    return Api.Repository.where({repository_id : params.repository_id, owner: App.get('githubUsername') }).findOne();
  },
  serialize: function(model, params) {
    return { 
      repository_id: model.get('name') 
    };
  },
  renderTemplate: function(controller, model) {
    controller.loadReadMe(model);
    this.render();
    this.render('readMe', {   // the template to render
      into: 'repository',          // the template to render into
      controller: 'readMe'  // the controller to use for the template
    });
  }
});

App.DemosRoute = App.PrivateRoute.extend({
  model: function() {
    return Api.Demo.where({ asrToken: App.get('asrToken') }).findMany();
  }
});
App.DemoRoute = App.PrivateRoute.extend({
});
App.GistsRoute = Ember.Route.extend({});
App.SnippetsRoute = Ember.Route.extend({});







/**
          CONTROLLERS
          */

App.LoginController = Ember.Controller.extend({

  reset: function() {
    this.setProperties({
      username: "",
      password: "",
      errorMessage: ""
    });
  },

  /*token: localStorage.token,
  tokenChanged: function() {
    localStorage.token = this.get('token');
  }.observes('token'),*/

  login: function() {

    var self = this, credentials = this.getProperties('username', 'password');

    // Clear out any error messages.
    this.set('errorMessage', null);

    var asrTokenRequestUrl = App.asrTokenRequestTemplate.replace('USER_NAME', credentials.username).replace('PASS_WORD', credentials.password);

    $.getJSON(asrTokenRequestUrl).done(function(tokenDetails) {
      if (tokenDetails) {
        var attemptedTransition = self.get('attemptedTransition');
        Api.User.where({ id : credentials.username }).findOne()
          .done(function(user) {
            App.set('asrToken', tokenDetails.access_token);
            App.set('githubUsername', user.get('githubUsername'));
            Ember.run.later(this, function(){
              App.set('asrToken', null);
            }, (tokenDetails.expires_in - 60) * 1000);
            if (attemptedTransition) {
              attemptedTransition.retry();
              self.set('attemptedTransition', null);
            } else {
              // Redirect to 'repositories' by default.
              self.transitionToRoute('repositories');
            }
          })
          .fail(function(e) {
            self.set('errorMessage', 'Sorry, ' + credentials.username + ', but you are not registered yet!');
            self.transitionToRoute('login');
          });
      }
    }).fail(function(e)  {
      self.set('errorMessage', 'Invalid Credentials');
      self.transitionToRoute('login');
    });
  }
});
App.RepositoryController = Ember.ObjectController.extend({
    loadReadMe: function(model) {
      Api.RepositoryReadMe.where({repository_id : this.get('name'), owner : App.get('githubUsername')}).findOne()
        .done(function(data) {
          var text = data.get('readMe');
          var newText = text.replace(/[\{\}]/g, '');
          model.set('readMe', newText);
        })
        .fail(function(e) {
          model.set('readMe', e[0].statusText);
        });
    }
 });



/**
          HELPERS
          */

var showdown = new Showdown.converter();

Ember.Handlebars.registerBoundHelper('markdown', function(input) {
  return new Handlebars.SafeString(showdown.makeHtml(input));
});

Ember.Handlebars.registerBoundHelper('date', function(date) {
  return moment(date).fromNow();
});