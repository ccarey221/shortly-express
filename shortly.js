var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('client-sessions');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  cookieName: 'session',
  secret: 'lkafhlk34hlih3aw4fklhafk',
  activeDuration: 5 * 60 * 1000
}));

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  Users
    .query('where', 'username', '=', username)
    .fetch()
    .then(function(model) {
      if (!model.models.length) {
        Users.create({
          username: username,
          password: password
        });
        res.render('login');
      } else {
        console.log('Username already taken');
        res.render('signup');
      }
    });
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var givenUsername = req.body.username;
  var givenPassword = req.body.password;

  Users
    .query('where', 'username', '=', givenUsername)
    .fetch()
    .then(function(model) {
      if (!!model.models.length) {
        var password = model.models[0].get('password');
        if (bcrypt.compareSync(givenPassword, password)) {
          console.log('logged in');
          req.session.user = model.models[0]; //ugly object
          res.render('index');
        } else {
          console.log('wrong pass');
          res.render('login');
        }
      } else {
        console.log('couldnt find user');
        res.render('signup');
      }
    });
});

app.get('/', function(req, res) {
  if (req.session && req.session.user) {
    Users
      .query('where', 'username', '=', req.session.user.username)
      .fetch()
      .then(function(model) {
        if (!model.models.length) {
          console.log('authentication failed resetting to login page');
          req.session.reset();
          res.render('login');
        } else {
          res.locals.user = model.models[0];
          console.log('authentication passed resetting to index page');
          res.render('index');
        }
      });
  } else {
    console.log('req session or req user does not exist')
    res.render('login');
  }
});

app.get('/create', function(req, res) {
  if (req.session && req.session.user) {
    Users
      .query('where', 'username', '=', req.session.user.username)
      .fetch()
      .then(function(model) {
        if (!model.models.length) {
          console.log('authentication failed resetting to login page');
          req.session.reset();
          res.render('login');
        } else {
          res.locals.user = model.models[0];
          console.log('authentication passed resetting to index page');
          res.render('index');
        }
      });
  } else {
    console.log('req session or req user does not exist');
    res.render('login');
  }
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/logout',
function(req, res) {
  console.log('logout yo')
  req.session.destroy(function(err) {
    console.log('err', err)
  })
  res.render('login');
}
);

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
