module.exports = {
    log: 'notice',
    irc: {
        host: 'irc.server.com',
        port: 6667,
        nick: 'TehBotnana'
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
    }
}
