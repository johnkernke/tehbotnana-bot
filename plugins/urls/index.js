var logger = new (require('../../lib/logger'))('URLs'),
    request = require('request'),
    url = require('url');

module.exports = urls;

function urls() {
    var self = this;
    self.channels = [];

    self.handler = function (channel, nick, message) {
        channel = channel.toLowerCase();
        var regex_url = /((https?|ftp)\:\/\/)?([a-z0-9+!*(),;?&=\$_.-]+(\:[a-z0-9+!*(),;?&=\$_.-]+)?@)?([a-z0-9-.]*)\.([a-z]{2,4})(\:[0-9]{2,5})?(\/([a-z0-9+\$_-]\.?)+)*\/?(\?[a-z+&\$_.-][a-z0-9;:@&%=+\/\$_.-]*)?(#[a-z_.-][a-z0-9+\$_.-]*)?/ig,
            regex_url_start = /(https?|ftp)\:\/\/.+?/ig,
            regex_title = /<\s*title[^>]*>(.+?)<\s*\/\s*title>/gi;

        if (self.channels.indexOf(channel) == -1) {
            return;
        }

        var msg_url = regex_url.exec(message);
        if (msg_url == null) {
            return;
        }

        msg_url = msg_url[0];
        if (!regex_url_start.test(msg_url)) {
            msg_url = 'http://' + msg_url;
        }

        msg_url = url.parse(msg_url);

        if (msg_url.protocol !== 'http:' && msg_url.protocol !== 'https:') {
            return;
        }

        msg_url = url.format(msg_url);
        logger.notice('Looking up ' + msg_url);
        request(msg_url, function (error, res, body) {
            if (error) {
                logger.notice('Error getting page (' + msg_url + '): ' + error);
                app.irc.sendMessage(channel, 'Error for ' + msg_url);
            }

            var title = regex_title.exec(body);
            if (title == null) {
                app.irc.sendMessage(channel, 'Unable to get page title for ' + msg_url);
            } else {
                title = title[1];

                if (res.request.uri.host == 'www.youtube.com') {
                    // make pretty text for YouTube
                    title = title.replace(' - YouTube', '');
                    app.irc.sendMessage(channel, app.irc.color('You', 'black', 'white') + app.irc.color('Tube', 'white', 'red') + ': ' + title);
                } else {
                    app.irc.sendMessage(channel, 'Title: ' + title);                    
                }
            }
        });
    }

    for (channel in app.config.channels) {
        if (app.config.channels[channel].urls === true) {
            self.channels.push(channel.toLowerCase());
        }
    }

    logger.notice('Enabled for: ' + self.channels.join(', '));

    app.irc.on('message', self.handler);
}
