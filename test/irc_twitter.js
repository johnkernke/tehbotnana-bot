
// mock irc object.. maybe change this to include the normal one, but modify it slightly
function irc() {
    var self = this;
    self.events = [];
    self.on = function (event, callback) {
        self.events[event] = callback;
    };

    // work out better emit style.. and have unlimited params
    self.emit = function (event, params) {
        if (self.events[event] !== undefined) {
            self.events[event](params);
        }
    };

    self.sendMessage = function (channel, message) {
        // 
    };
};

app = {};
app.config = require('../config');
app.irc = new irc();

new (require('../lib/irc_twitter'))();
app.irc.emit('join-self', '#ApproachingNirvana');
