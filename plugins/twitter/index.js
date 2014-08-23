var ntwitter = new (require('ntwitter'))(app.config.twitter),
    entities = new (require('html-entities').AllHtmlEntities),
    logger = new (require('logger'))(app.config.log, 'Twitter');

module.exports = irc_twitter;

function irc_twitter() {
    var self = this;
    self.connected = false;
    self.accounts = {};
    self.channels = {};
    self.stream = undefined;
    self.account_requests = {};

    // startup procedure
    self.init = function () {
        // only do init once, but we do it once we join one channel (we should be connected to all at the same time)
        if (self.connected) {
            return;
        }
        self.connected = true;

        var account_count = 0,
            account_done = false;

        for (var channel in app.config.channels) {
            var channel_obj = app.config.channels[channel];

            if (channel_obj.twitter === undefined) {
                // no twitter config set for channel, ignore it
                continue;
            }

            // generate regex for blocked users / content
            self._generate_blocks(channel, channel_obj.twitter.blocked);

            // go through all accounts for this channel
            for (var i = 0, l = channel_obj.twitter.accounts.length; i < l; i++) {
                // get account ids, do some checking for once we have all (yey async) and then start the twitter stream with all of them
                account_count++;
                self.getTwitterId(channel_obj.twitter.accounts[i], channel, function () {
                    account_count--;

                    if (account_done && account_count == 0) {
                        account_done = false;
                        self.streamStart();
                    }
                });
            }
        }

        account_done = true;
    };

    self._generate_blocks = function (channel, blocked) {
        self.channels[channel] = { users: [], content: [] };
        for (var i = 0, l = blocked.users.length; i < l; i++) {
            self.channels[channel].users[blocked.users[i]] = new RegExp(blocked.users[i], 'i');
        }

        for (var i = 0, l = blocked.content.length; i < l; i++) {
            self.channels[channel].content[blocked.content[i]] = new RegExp(blocked.content[i], 'i');
        }
    }

    self.getTwitterId = function (account, channel, cb) {
        logger.notice('looking up id for ' + account);

        for (var account_id in self.accounts) {
            if (self.accounts[account_id].account == account) {
                logger.notice('Found (existing) id for ' + account + ' (' + account_id + ')');
                self.accounts[account_id].channels.push(channel);
                return cb(account, channel);
            }
        }

        // dont look up the account if we already are.. just file a request!
        if (self.account_requests[account] !== undefined) {
            self.account_requests[account].push(channel);
            return;
        }

        self.account_requests[account] = [];

        ntwitter.showUser(account, function (err, data) {
            var account_id = 0;
            if (err) {
                // maybe log these and put them into their respective channels after all checks are done?
                logger.notice('Unable to find id for ' + account);
            } else {
                account_id = data[0].id;
                logger.notice('Found id for ' + account + ' (' + account_id + ')');
                self.accounts[account_id] = { name: account, channels: [channel] };
            }

            // fill out requests
            for (var i = 0, l = self.account_requests[account].length; i < l; i++) {
                var chan = self.account_requests[account][i];
                if (account_id !== 0) {
                    self.accounts[account_id].channels.push(chan);
                }

                cb(); // still have to call the callback for the request
            }

            delete self.account_requests[account];

            cb();
        });
    };

    self.streamStart = function () {
        var accounts = [];
        for (var account_id in self.accounts) {
            accounts.push(account_id);
        }

        if (self.stream !== undefined) {
            // we already have a stream? need to kill it.
            // @todo destroySilent might not exist? le test!
            self.stream.destroySilent(); // silent destroy as to not trigger the destroy event (we would just come back here and looooooooooop)
            self.stream = undefined;
        }

        self.stream = ntwitter.stream('statuses/filter', {'follow': accounts.join(',')}, function (stream) {

            // handle events
            stream.on('data', self.streamOnData);
            stream.on('error', function (err, status) {
                self.streamRestart('end', err, status);
            });

            stream.on('end', function (response) {
                self.streamRestart('end', response);
            });

            stream.on('destroy', function (response) {
                self.streamRestart('destory', response);
            });
        });
    };

    self.streamOnData = function (data) {
        if (!data || !data.user || !self.accounts[data.user.id]) {
            return;
        }

        var message = self.parseTweet(data),
            channels = self.accounts[data.user.id].channels;

        logger.notice('tweet recieved (' + channels.join(', ') + '): ' + message); // clean the message so it doesnt have colour codes, bold, etc?

        // loop through all channels for this account
        channels.map(function (channel) {
            // check blocked users
            for (var blocked_user in self.channels[channel].users) {
                var re = self.channels[channel].users[blocked_user];

                // check the retweet user
                if (data.retweeted_status !== undefined && re.test(data.retweeted_status.user.screen_name)) {
                    logger.notice('Retweet blocked (' + channel + '), by ' + blocked_user);
                    return; // move to next channel, it might not be blocked there!
                }
            }

            // check blocked content
            for (var blocked_content in self.channels[channel].content) {
                var re = self.channels[channel].content[blocked_content];

                if (data.retweeted_status !== undefined) {
                    // check retweet
                    if (re.test(data.retweeted_status.text)) {
                        logger.notice('Retweet blocked (' + channel + '), contained "' + blocked_content + '"');
                        return; // move to next channel, it might not be blocked there!
                    }
                } else {
                    // check normal
                    if (re.test(data.text)) {
                        logger.notice('Tweet blocked (' + channel + '), contained "' + blocked_content + '"');
                        return; // move to next channel, it might not be blocked there!
                    }
                }
            }

            app.irc.sendMessage(channel, message);
        });
    };

    self.parseTweet = function (tweet) {
        var tweet_link = ' -- http://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
        message = app.irc.color('@' + tweet.user.screen_name, 'cyan') + ': ',
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

    self.streamRestart = function (method, response, status) {
        logger.notice(method + ' > ' + response + (status !== undefined ? ' (' + status + ')' : ''));

        if (method === 'end' && status == 420) {
            // error.. there is already a connection using our auth stuff =\
            logger.notice('Waiting 120 seconds before connecting again.. twitter is rate limiting us.');
            setTimeout(self.streamStart, 120000);
        } else {
            self.streamStart();
        }
    };

    app.irc.on('join-self', self.init); // start only once we have joined a channel
}
