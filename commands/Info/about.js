module.exports = {
	help: ()=> "A little about the bot",
	usage: ()=> [" - Just what's on the tin"],
	execute: async (bot, msg, args) => {
		return {embed: {
			title: '**About**',
			fields:[
				{name: "Prefixes", value: "`fcm!command`"},
				{name: "Creator", value: "Callum (Callum#0003)"},
				{name: "Guilds", value: bot.guilds.size},
				{name: "Users", value: bot.users.size}
			]
		}}
	},
	alias: ['abt', 'a'],
	module: "utility"
}
