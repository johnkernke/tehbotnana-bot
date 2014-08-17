var logger = new (require('logger'))(app.config.log, 'URLs'),
    request = require('request'),
    url = require('url'),
    tld = require('tldjs');

module.exports = urls;

function urls() {
    var self = this;
    self.channels = {};
    self.cachetime = app.config.urls.cache || 0;
    self.cache = {};

    self.handler = function (channel, nick, message) {
        channel = channel.toLowerCase();
        var _cfg = self.channels[channel],
            regex_url = /(?:(\S*)\:\/\/)?(?:[a-z0-9+!*(),;?&=\$_.-]+(?:\:[a-z0-9+!*(),;?&=\$_.-]+)?@)?(?:[a-z0-9-.]*)\.(?:[a-z]{2,4})(?:\:[0-9]{2,5})?(?:\/(?:[a-z0-9+\$_-]\.?)+)*\/?(?:\?[a-z+&\$_.-][a-z0-9;:@&%=+\/\$_.-]*)?(?:#[a-z_.-][a-z0-9+\$_.-]*)?/ig,
            match,
            matches = [],
            now = new Date().getTime(),
            titles = {},
            count = 0;

        if (_cfg == undefined) {
            return;
        }

        if (_cfg.last_link >= (now - (_cfg.global_cooldown * 1000))) {
            logger.notice('Hit global cooldown for ' + channel);
            return;
        }
        _cfg.last_link = now;

        if (_cfg.user_whitelist.length > 0 && _cfg.whitelist.indexOf(nick) == -1) {
            logger.notice('Blocked link from (whitelist): ' + nick);
            return;
        }

        if (_cfg.user_blacklist.length > 0 && _cfg.blacklist.indexOf(nick) > -1) {
            logger.notice('Blocked link from (blacklist): ' + nick);
            return;
        }

        while(match = regex_url.exec(message)) {
            if (match[1] == undefined) {
                match[0] = 'http://' + match[0];
            } else if (match[1] != 'http' && match[1] != 'https') {
                continue;
            }

            if (matches.indexOf(match[0]) > -1) {
                continue;
            }

            if (!tld.tldExists(match[0])) {
                continue;
            }

            if (_cfg.urls[match[0]] !== undefined && _cfg.urls[match[0]] >= (now - (_cfg.single_cooldown * 1000))) {
                logger.notice('Hit single url cooldown for ' + match[0]);
                continue;
            }
            _cfg.urls[match[0]] = now;

            matches.push(match[0]);
        }

        if (matches.length == 0) {
            return;
        } else if (matches.length > 1) {
            if (_cfg.multilink == 'off') {
                return;
            } else if (_cfg.multilink == 'first') {
                matches = [matches[0]];
            }
        }

        matches.map(function (uri) {
            count++;

            var uri_data = url.parse(uri);
            if (_cfg.domain_whitelist.length > 0 && _cfg.domain_whitelist.indexOf(uri_data.hostname) == -1) {
                logger.notice('Blocked domain (whitelist): ' + uri_data.hostname);
                return;
            }

            if (_cfg.domain_blacklist.length > 0 && _cfg.domain_blacklist.indexOf(uri_data.hostname) > -1) {
                logger.notice('Blocked domain (blacklist): ' + uri_data.hostname);
                return;
            }

            if (self.cache[uri] !== undefined) {
                if (self.cache[uri].time > now) {
                    logger.notice('Hit cache for ' + uri);
                    titles[uri] = self.cache[uri].title;
                    process.nextTick(function () {
                        // do this for async goodness
                        self.sendTitles(--count, titles, channel);
                    });
                } else {
                    delete self.cache[uri];
                }
            }

            request(uri, function (error, res, body) {
                if (error) {
                    logger.notice('Error getting page (' + uri + '). ' + error);
                    titles[uri] = 'Error getting page ' + uri;
                } else {
                    var title = /<\s*title[^>]*>(.+?)<\s*\/\s*title>/gi.exec(body);
                    if (title == null) {
                        titles[uri] = 'Unable to get page title.';
                    } else {
                        titles[uri] = self.makeTitle(title[1], uri);

                        if (self.cachetime > 0) {
                            self.cache[uri] = {
                                time: now + (self.cachetime * 1000),
                                title: titles[uri]
                            }
                        }
                    }
                }

                self.sendTitles(--count, titles, channel);
            });
        });
    };

    self.makeTitle = function (title, uri) {
        uri = url.parse(uri);
        if (uri.host == 'www.youtube.com' && uri.pathname == '/watch') {
            // make pretty text for YouTube
            title = title.replace(' - YouTube', '');
            return app.irc.color('You', 'black', 'white') + app.irc.color('Tube', 'white', 'red') + ': ' + title;
        } else {
            return 'Title: ' + title;
        }
    };

    self.sendTitles = function (count, titles, channel) {
        if (count == 0) {
            for (var _url in titles) {
                app.irc.sendMessage(channel, titles[_url]);
            }
        }
    };

    var channel_list = [];
    for (channel in app.config.channels) {
        if (app.config.channels[channel].urls !== undefined) {
            var _cfg = app.config.channels[channel].urls;
            channel_list.push(channel.toLowerCase());
            self.channels[channel.toLowerCase()] = {
                global_cooldown: _cfg.global_cooldown || 10,
                single_cooldown: _cfg.single_cooldown || 1800,
                multilink: _cfg.multilink || 'off',
                user_blacklist: _cfg.user_blacklist || [],
                user_whitelist: _cfg.user_whitelist || [],
                domain_blacklist: _cfg.domain_blacklist || [],
                domain_whitelist: _cfg.domain_whitelist || [],
                urls: {},
                last_link: 0
            }
        }
    }

    logger.notice('Enabled for: ' + channel_list.join(', '));
    delete channel_list;

    app.irc.on('message', self.handler);
}
