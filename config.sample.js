module.exports = {
    irc: {
        host: 'irc.server.com',
        port: 6667,
        nick: 'TehBotnana',
        log: 'notice'
    },
    channels: {
        "#tehbotnana": {
            twitter: {
                accounts: ["tehbanana_"],
                blocked: {
                    users: ["blockeduser"],
                    content: ["blockedcontent"]
                }
            }
        },
        "#tehbanana": {
            twitter: {
                accounts: ["tehbanana_"],
                blocked: {
                    users: ["blockeduser"],
                    content: ["blockedcontent"]
                }
            }
        },
        "#random": {

        }
    },
    twitter: {
        consumer_key: '',
        consumer_secret: '',
        access_token_key: '',
        access_token_secret: ''
    },
    twitter_verbose: true // need to make this nicer, without passing through to ntwitter.. use similar method to IRC, maybe join the config setting?
}
