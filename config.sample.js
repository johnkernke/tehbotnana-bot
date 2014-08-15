module.exports = {
    log: 'notice',
    irc: {
        host: 'irc.server.com',
        port: 6667,
        nick: 'TehBotnana'
    },
    channels: {
        "#tehbanana": {
            twitter: {
                accounts: ["tehbanana_"],
                blocked: {
                    users: [],
                    content: []
                }
            },
            urls: {
                global_cooldown: 10,
                single_cooldown: 1800,
                multilink: 'first', // off / first / all
                user_blacklist: [],
                user_whitelist: [],
                domain_blacklist: [],
                domain_whitelist: []
            }
        }
    },
    twitter: {
        consumer_key: '',
        consumer_secret: '',
        access_token_key: '',
        access_token_secret: ''
    },
    urls: {
        cache: 300
    }
}
