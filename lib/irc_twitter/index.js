var util = require('util'),
    ntwitter = new (require('ntwitter'))(app.config.twitter.auth),
    entities = new (require('html-entities').AllHtmlEntities);

module.exports = irc_twitter;

function irc_twitter() {
    var self = this;
    self.cons = {
        connecting: [],
        connected: []
    };
    self.channels = {};
    self.verbose = app.config.twitter.verbose || false;

    self.connect = function (channel) {
        var channel_conf = app.config.twitter.channels[channel]
        if (!channel_conf || !channel_conf.twitter) {
            return;
        }

        self.cons.connecting.push(channel);
        self.getTwitterId(channel_conf.twitter, channel, self.streamStart);
    };

    self.getTwitterId = function (account, channel, cb) {
        self.log('looking up id for ' + account);
        ntwitter.showUser(account, function (err, data) {
            if (err) {
                self.log('Unable to find id for ' + account);
            } else {
                self.channels[data[0].id] = channel;
                cb(data[0].id);
            }
        });
    };

    self.streamStart = function (account_id) {
        self.log('starting stream for ' + account_id);
        var channel = self.channels[account_id];
        ntwitter.stream('statuses/filter', {'follow': account_id}, function (stream) {

            // set the connection for this channel as connected
            var connecting_id = self.cons.connecting.indexOf(channel);
            if (connecting_id != -1) {
                self.cons.connecting.splice(connecting_id, 1);
                self.cons.connected.push(channel);
            }

            // handle events
            stream.on('data', self.streamOnData);
            stream.on('error', function (err, status) {
                self.streamRestart(channel, 'end', err, status);
            });

            stream.on('end', function (response) {
                self.streamRestart(channel, 'end', response);
            });

            stream.on('destroy', function (response) {
                self.streamRestart(channel, 'destory', response);
            });
        });
    };

    self.streamOnData = function (data) {
        if (!data || !data.user || !self.channels[data.user.id]) {
            return;
        }

        // check for blocked users/content
        var blocked = app.config.twitter.channels[self.channels[data.user.id]].blocked;
        for (var i in blocked.users) {
            var re = new RegExp(blocked.users[i], 'i');
            // check retweet user
            if (data.retweeted_status !== undefined && re.test(data.retweeted_status.user.screen_name)) {
                self.log('Retweet blocked, by ' + blocked.users[i]);
                return;
            }
        }

        for (var i in blocked.content) {
            var re = new RegExp(blocked.users[i], 'i');

            if (data.retweeted_status !== undefined) {
                // check retweet content
                if (re.test(data.retweeted_status.text)) {
                    self.log('Retweet blocked, contained "' + blocked[i] + '"');
                    return;
                }
            } else {
                // check normal content
                if (re.test(data.text)) {
                    self.log('Tweet blocked, contained "' + blocked[i] + '"');
                    return;
                }
            }
        }

        var message = self.parseTweet(data);

        self.log('tweet recieved: ' + message);
        app.irc.sendMessage(self.channels[data.user.id], message);
    };

    self.parseTweet = function (tweet) {
        var tweet_link = ' -- http://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
        message = '@' + tweet.user.screen_name + ': ',
        text,
        urls;

      if (tweet.retweeted_status !== undefined) {
        // handle RT
        message += 'RT (' + tweet.retweeted_status.user.screen_name + ') ';
        text = tweet.retweeted_status.text;
        urls = tweet.retweeted_status.entities.urls;
      } else {
        // do everything else
        text = tweet.text;
        urls = tweet.entities.urls;

        if (tweet.text.substr(0, 1) !== '@') {
          // remove the tweet link if we dont have a reply
          tweet_link = '';
        }
      }

      // alter the text to how we need it
      for (var i = 0; i < urls.length; i++) {
        text = text.replace(urls[i].url, urls[i].expanded_url);
      }
      text = entities.decode(text);
      text = text.replace(/\r?\n/g, ' ');

      // final touches on the message
      message += text + tweet_link;

      return message;
    };

    self.streamRestart = function (channel, method, response, status) {
        self.log(method + ' (' + channel + ') > ' + response + (status !== undefined ? ' (' + status + ')' : ''));

        // remove the connection for this channel
        var connected_id = self.cons.connected.indexOf(channel);
        if (connected_id != -1) {
            self.cons.connected.splice(connected_id, 1);
        }

        // if we are already connecting, dont try and connect again
        var connecting_id = self.cons.connecting.indexOf(channel);
        if (connecting_id == -1) {
            if (method === 'end' && status == 420) {
                self.log('Waiting 120 seconds before connecting again.. twitter is rate limiting us.');
                setTimeout(function () {
                    self.connect(channel);
                }, 120000);
            } else {
                self.connect(channel);
            }
        }
    };

    // logging
    self.log = function (message) {
        if (self.verbose) {
            util.log('Twitter - ' + message);
        }
    };

    app.irc.on('join-self', self.connect);
}
