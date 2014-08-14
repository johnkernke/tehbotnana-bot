var fs = require('fs');

app = {};
app.config = require('./config.js');

app.config.irc.autoJoinChannels = [];
for (var channel in app.config.channels) {
    app.config.irc.autoJoinChannels.push(channel);
}

app.irc = new (require('./lib/irc'))(app.config.irc);

// load all plugins from the directory
fs.readdirSync('./plugins/').forEach(function (file) {
    if (fs.lstatSync('./plugins/' + file).isDirectory() && fs.lstatSync('./plugins/' + file + '/index.js').isFile()) {
        new (require('./plugins/' + file))();
    }
});

// need to really work out handling this better, also need to make it detect disconnects better
app.irc.on('disconnect', function () {
  setTimeout(app.irc.connect, 60000);
});

app.irc.connect();
