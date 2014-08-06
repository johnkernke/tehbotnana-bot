app = {};
app.config = require('./config.js');
app.irc = new (require('./lib/irc'))(app.config.irc);

new (require('./lib/irc_twitter'))();

// need to really work out handling this better
app.irc.on('disconnect', function () {
  setTimeout(app.irc.connect, 60000);
});

app.irc.connect();
