module.exports = async (msg, emoji, user, bot) => {
	try {
		if(!msg.guild) msg = await bot.getMessage(msg.channel.id, msg.id);
	} catch(e) {
		//race condition: message reaction added, message immediately deleted?
		//alternatively: reaction added, access revoked, or request times out
		//log the error and quit, not much else we can do
		console.log(e);
		return;
	}
	

	if(bot.menus && bot.menus[msg.id] && bot.menus[msg.id].user == user) {
		try {
			await bot.menus[msg.id].execute(bot, msg, emoji, user);	
		} catch(e) {
			console.log(e);
			msg.channel.createMessage("ERR:\n"+e.message);
		}
		return;
	}

	if(!msg.guild) return;
	if(emoji.id) emoji.name = `:${emoji.name}:${emoji.id}`;

	bot.utils.handleStarboardReactions(bot, msg, emoji, user);

	if(user == bot.user.id) return;

	bot.utils.handleReactPostReactions(bot, msg, emoji, user);

}