var fs = require('fs'),
    tehbotnana_plugins = require('tehbotnana-plugins');

app = {};
app.config = require('./config.js');

app.config.irc.log = app.config.log;
app.config.irc.autoJoinChannels = [];
for (var channel in app.config.channels) {
    app.config.irc.autoJoinChannels.push(channel);
}

app.irc = new (require('tehbotnana-irc'))(app.config.irc);

// load plugins
tehbotnana_plugins.load();

// need to really work out handling this better, also need to make it detect disconnects better
app.irc.on('disconnect', function () {
  setTimeout(app.irc.connect, 60000);
});

app.irc.connect();
