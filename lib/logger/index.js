var util = require('util'),
    log_levels = ['error', 'warning', 'notice', 'debug'];

module.exports = logger;

function logger(prefix) {
    var self = this;
    self.level = log_levels.indexOf(app.config.log || 'error');
    self.prefix = prefix || '';

    self.log = function (level, message) {
        if (log_levels.indexOf(level) > self.level) {
            return;
        }

        util.log((self.prefix == '' ? '' : prefix + ' - ') + message);
    };

    self.error = function (message) {
        self.log('error', message);
    };

    self.warning = function (message) {
        self.log('warning', message);
    };

    self.notice = function (message) {
        self.log('notice', message);
    };

    self.debug = function (message) {
        self.log('debug', message);
    };
}
