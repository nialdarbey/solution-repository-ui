App = Ember.Application.create({
  LOG_TRANSITIONS: true,
  asrTokenRequestTemplate: 'https://registry.mulesoft.com:443/api/access-token?grant_type=password&client_id=WEBUI&username=USER_NAME&password=PASS_WORD&scope=READ_SERVICES%20WRITE_SERVICES%20 CONSUME_SERVICES%20 APPLY_POLICIES%20READ_CONSUMERS%20WRITE_CONSUMERS%20 CONTRACT_MGMT%20 CONSUME_POLICIES',
  drTokenRequestTemplate: 'https://demo-repository-api.cloudhub.io/access-token?grant_type=password&client_id=web-ui&username=USER_NAME&password=PASS_WORD&scope=READ%20WRITE'
});

$.ajaxSetup({ cache: false });

/* demo-repository-api.cloudhub.io

          API

          */

Api = Milo.API.create();

Api.options('baseUrl', 'https://demo-repository-api.cloudhub.io/api');

Api.Demo = Milo.Model.extend({
    rootElement: 'services',
    uriTemplate: '/demos/:id',
    name: Milo.property('string'),
    summary: Milo.property('string'),
    description: Milo.property('string'),
    githubOwner: Milo.property('string'),
    releaseNotes: Milo.property('string'),
    url: Milo.property('string'),
    type: Milo.property('string'),
    version: Milo.property('string'),
    configs: Milo.property('string')
});
Api.Repository = Milo.Model.extend({
    rootElement: 'repositories',
    uriTemplate: '/repositories/:repository_id',
    name: Milo.property('string'),
    readMe: Milo.property('string')
});
Api.RepositoryReadMe = Milo.Model.extend({
    rootElement: 'readMe',
    uriTemplate: '/repositories/:repository_id/read-me',
    readMe: Milo.property('string')
});
Api.RepositoryConfigs = Milo.Model.extend({
    rootElement: 'configs',
    uriTemplate: '/repositories/:repository_id/configs',
    configs: Milo.property('string')
});
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
    srUser: Milo.property('string'),
    srPass: Milo.property('string'),
    githubUsername: Milo.property('string'),
    fullName: function() {
      var firstName = this.get('firstName');
      var lastName = this.get('lastName');
      return firstName + ' ' + lastName;
    }.property('firstName', 'lastName')
});



/***
          ROUTES
          */

App.Router.map(function() {
  this.route('home');
  this.resource('demos', function() {
    this.resource('demo', { path: '/:demo_id' });
  });
  this.resource('repositories', function() {
    this.resource('repository', { path: '/:repository_id' });
  });
  this.resource('snippets');
  this.resource('gists');
  this.resource('login');
  this.resource('logout');
});

App.ApplicationRoute = Ember.Route.extend({
  setupController: function(controller) {
    App.set('applicationController',controller);
  }
});

App.PrivateRoute = Ember.Route.extend({

  redirect: function(controller, context) {
    if (App.applicationController.get('loginExpired')) {
      this.transitionTo('login');
    } 
  },

  // beforeModel hook is only available from version rc 6
  beforeModel: function(transition) { 
    if (! this.controllerFor('login').get('token')) {
      this.redirectToLogin(transition);
    } 
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
App.LogoutRoute = Ember.Route.extend({
  setupController: function(controller, context) {
    controller.logout();
  }
})

App.RepositoriesRoute = App.PrivateRoute.extend({
  model: function() {
    var self = this;
    return Api.Repository.where({ owner: this.controllerFor('application').get('githubUsername')}).findMany().fail(function() {
      self.transitionTo('login');
    });
  }
});

App.RepositoryRoute = App.PrivateRoute.extend({
  model: function(params) {
    var self = this;
    return Api.Repository.where({repository_id : params.repository_id, owner: this.controllerFor('application').get('githubUsername') }).findOne().fail(function() {
      self.transitionTo('login');
    });;
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
    var self = this;
    return Api.Demo.findMany().fail(function() {
      self.transitionTo('login');
    });;
  }
});
App.DemoRoute = App.PrivateRoute.extend({
  model: function(params) {
    var self = this;
    return Api.Demo.where({demo_id : params.demo_id}).findOne().fail(function() {
      self.transitionTo('login');
    });;
  },
  serialize: function(model, params) {
    return { 
      demo_id: model.get('name') 
    };
  },
  renderTemplate: function(controller, model) {
    controller.loadConfigs(model);
    this.render();
    this.render('configs', {   // the template to render
      into: 'demo',          // the template to render into
      controller: 'configs'  // the controller to use for the template
    });
  }
});
App.GistsRoute = Ember.Route.extend({});
App.SnippetsRoute = Ember.Route.extend({});







/**
          CONTROLLERS
          */

App.ApplicationController = Ember.Controller.extend({
  drTokenExpiration: localStorage.drTokenExpiration,
  drTokenExpirationChanged: function() {
    localStorage.drTokenExpiration = this.get('drTokenExpiration');
  }.observes('drTokenExpiration'),
  drToken: localStorage.drToken,
  drTokenChanged: function() {
    var token = this.get('drToken');
    if (token === null) {
      localStorage.removeItem('drToken');
    } else {
      localStorage.drToken = this.get('drToken');
    }
  }.observes('drToken'),
  drTokenTimestamp: localStorage.drTokenTimestamp,
  drTokenTimestampChanged: function() {
    var timestamp = this.get('drTokenTimestamp');
    localStorage.drTokenTimestamp = timestamp;
  }.observes('drTokenTimestamp'),
  asrTokenExpiration: localStorage.asrTokenExpiration,
  asrTokenExpirationChanged: function() {
    localStorage.asrTokenExpiration = this.get('asrTokenExpiration');
  }.observes('asrTokenExpiration'),
  asrToken: localStorage.asrToken,
  asrTokenChanged: function() {
    var token = this.get('asrToken');
    if (token === null) {
      localStorage.removeItem('asrToken');
    } else {
      localStorage.asrToken = this.get('asrToken');
    }
  }.observes('asrToken'),
  asrTokenTimestamp: localStorage.asrTokenTimestamp,
  asrTokenTimestampChanged: function() {
    var timestamp = this.get('asrTokenTimestamp');
    localStorage.asrTokenTimestamp = timestamp;
  }.observes('asrTokenTimestamp'),
  githubUsername: localStorage.githubUsername,
  githubUsernameChanged: function() {
    localStorage.githubUsername = this.get('githubUsername');
  }.observes('githubUsername'),
  loginExpired: function() {
    if (this.get('asrToken')) {
      var now = new Date().getTime();
      var then = new Date(this.get('asrTokenTimestamp')).getTime();
      if (now - then >= (this.get('asrTokenExpiration') * 1000)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }.property('asrToken','asrTokenTimestamp', 'asrTokenExpiration')
});

App.LoginController = Ember.Controller.extend({

  needs: ['application'],
  
  reset: function() {
    this.setProperties({
      username: "",
      password: "",
      errorMessage: ""
    });
  },
  
  loggedIn: function() {
    return ! this.get('controllers.application').get('loginExpired');
  },

  login: function() {

    var self = this, credentials = this.getProperties('username', 'password');

    // Clear out any error messages.
    this.set('errorMessage', null);

    var drTokenRequestUrl = App.drTokenRequestTemplate.replace('USER_NAME', credentials.username).replace('PASS_WORD', credentials.password);

    var tokenDate = new Date();
    $.getJSON(drTokenRequestUrl).done(function(drToken) {
      if (drToken) {
        Api.queryParams('access_token', drToken.access_token);
        var attemptedTransition = self.get('attemptedTransition');
        Api.User.where({ id : credentials.username }).findOne()
          .done(function(user) {
              var asrTokenRequestUrl = App.asrTokenRequestTemplate.replace('USER_NAME', user.get('srUser')).replace('PASS_WORD', user.get('srPass'));
              $.getJSON(asrTokenRequestUrl)
                .done(function(asrToken) {
                  if (asrToken) {
                    self.get('controllers.application').set('asrToken', asrToken.access_token);
                    self.get('controllers.application').set('asrTokenTimestamp', tokenDate);
                    self.get('controllers.application').set('githubUsername', user.get('githubUsername'));
                    self.get('controllers.application').set('asrTokenExpiration', asrToken.expires_in);
                    self.get('controllers.application').set('drToken', drToken.access_token);
                    self.get('controllers.application').set('drTokenTimestamp', tokenDate);
                    self.get('controllers.application').set('drTokenExpiration', drToken.expires_in);
                    Api.queryParams('asrToken', asrToken.access_token);
                    if (attemptedTransition) {
                      attemptedTransition.retry();
                      self.set('attemptedTransition', null);
                    } else {
                      // Redirect to 'repositories' by default.
                      self.transitionToRoute('repositories');
                    }
                  }
                })
                .fail(function(e) {
                  self.set('errorMessage', 'Sorry, ' + credentials.username + ', but there has been a problem communicating with Anypoint Service Registry!');
                  self.transitionToRoute('login');
                })
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
App.LogoutController = Ember.ObjectController.extend({
  needs: ['application'],
  logout: function() {
    this.get('controllers.application').set('asrTokenExpiration', null);
    this.get('controllers.application').set('asrTokenTimestamp', null);
    this.get('controllers.application').set('asrToken', null);
    this.get('controllers.application').set('githubUsername', null);
    this.get('controllers.application').set('drTokenExpiration', null);
    this.get('controllers.application').set('drTokenTimestamp', null);
    this.get('controllers.application').set('drToken', null);
    this.transitionToRoute('login');
  }
});
App.RepositoryController = Ember.ObjectController.extend({
    needs: ['application'],
    
    loadReadMe: function(model) {
      Api.RepositoryReadMe.where({repository_id : this.get('name'), owner : this.get('controllers.application').get('githubUsername')}).findOne()
        .done(function(data) {
          var text = data.get('readMe');
          model.set('readMe', text);
        })
        .fail(function(e) {
          model.set('readMe', e[0].statusText);
        });
    },
    
    register: function() {
      var demo = Api.Demo.create({
        name: this.get('name'),
        description: this.get('readMe').substring(0,2048).replace(/\n/g, '\\n'),
        summary: this.get('description').substring(0,96).replace(/\n/g, '\\n'),
        githubOwner: this.get('controllers.application').get('githubUsername'),
        releaseNotes: 'test',
        url: 'http://localhost',
        type: 'github',
        version: '3.4.0'
      });
      demo.save().done(function() {
        alert('registered');
      });
    }
 });

App.DemoController = Ember.ObjectController.extend({
  needs: ['application'],
  
  loadConfigs: function(model) {
    Api.RepositoryConfigs.where({repository_id : this.get('name'), owner : this.get('controllers.application').get('githubUsername')}).findOne()
      .done(function(data) {
        var text = data.get('configs');
        model.set('configs', text);
      })
      .fail(function(e) {
        model.set('configs', e[0].statusText);
      });
  }

});




/**
 *         VIEWS
 */

App.RepositoriesView = Em.View.extend({
  didInsertElement: function () {
    $('tbody tr').click(function(event) {
      $(this).addClass('highlight').siblings().removeClass('highlight');
    });
  }
});

App.ConfigsView = Em.View.extend({
  didInsertElement: function () {
    var t = $('div.mule-config').text();
    $('div.mule-config').prepend(t);
    $('div.mule-config configs').each(function(i, e) {hljs.highlightBlock(e, null, true)});
  },
  layout: Ember.Handlebars.compile('<div class="mule-config"><pre><code>{{yield}}</code></pre></div>')
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

Ember.Handlebars.registerBoundHelper("showXml", function(xml) {
  return vkbeautify.xml(xml);
});