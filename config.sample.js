module.exports = {
    irc: {
        host: 'irc.server.com',
        port: 6667,
        nick: 'TehBotnana',
        autoJoinChannels: ['#TehBotnana'],
        log: 'notice'
    },
    twitter: {
        auth: {
            consumer_key: '',
            consumer_secret: '',
            access_token_key: '',
            access_token_secret: ''
        },
        channels: {
            "#TehBotnana": {
                twitter: "tehbanana_",
                blocked: {
                    users: ["blockeduser"],
                    content: ["blockedcontent"]
                }
            }
        },
        verbose: true
    }
}
