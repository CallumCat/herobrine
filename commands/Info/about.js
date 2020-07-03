module.exports = {
	help: ()=> "A little about the bot",
	usage: ()=> [" - Just what's on the tin"],
	execute: async (bot, msg, args) => {
		return {embed: {
			title: '**About**',
			fields:[
				{name: "Prefixes", value: "`hh!command`, `heyhero command`, or `heyherobrine command`"},
				{name: "Creator", value: "greysdawn (GreySkies#9950)"},
				{name: "Repo", value: "https://github.com/greys-bots/herobrine"},
				{name: "Website", value: "https://hb.greysdawn.com/"},
				{name: "Support Discord", value: "https://discord.gg/EvDmXGt"},
				{name: "Creator's Patreon", value: "https://patreon.com/greysdawn"},
				{name: "Creator's Ko-Fi", value: "https://ko-fi.com/greysdawn"},
				{name: "Guilds", value: bot.guilds.size},
				{name: "Users", value: bot.users.size}
			]
		}}
	},
	alias: ['abt', 'a'],
	module: "utility"
}