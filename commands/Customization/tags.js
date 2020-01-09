module.exports = {
	help: ()=> "Set custom trigger words and responses. NOTE: Not the same as the `trigs` command.",
	usage: ()=> [" - Lists all registered tags",
				 " add - Runs a menu to create a new tag and responses",
				 " remove [tag name] - Deletes a tag",
				 " info [tag name] - Info on the tag",
				 " edit [tag name] - Runs a menu to edit a tag"],
	desc: ()=> "If you're looking for custom commands, that's currently a work in progress.",
	execute: async (bot, msg, args) => {
		var tags = await bot.utils.getTags(bot, msg.guild.id);
		if(tags) {
			msg.channel.createMessage({embed: {
				title: "Server Tags",
				description: "Tags that have been registered for the server",
				fields: tags.map(t => {
					return {name: t.name, value: typeof t.value == "string" ? t.value.substring(0, 128)+(t.value.length > 128 ? "..." : "") : t.value.map(r => r.substring(0, 128)+(r.length > 128 ? "..." : "")).join("\n")}
				})
			}})
		} else {
			msg.channel.createMessage("No tags registered");
		}
	},
	guildOnly: true,
	alias: ["tag","response","responses"],
	subcommands: {},
	module: "utility"
}

module.exports.subcommands.add = {
	help: ()=> "Add a custom response",
	usage: ()=> [" - Run a set up menu to create a new tag and response"],
	execute: async (bot, msg, args) => {
		var tags = await bot.utils.getTags(bot, msg.guild.id);

		var name;
		var val = [];

		await msg.channel.createMessage("Enter a name for the tag. This is what will activate the response. Examples: `server rules`, `modinfo`, etc.\nThe bot's prefix doesn't need to be present for the response to work.");
		var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
		if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting");
		var cmd = await bot.parseCommand(bot, msg, resp[0].content.toLowerCase().split(" "));
		if(tags && tags.find(t => t.name == resp[0].content.toLowerCase()) || cmd) return msg.channel.createMessage("ERR: another tag or command exists with that name. Aborting");
		name = resp[0].content.toLowerCase();

		var done;
		try {
			for(var i = 0; i < 5; i++) {
				if(done) break;
				await msg.channel.createMessage(`Response number: ${i+1}/5\nEnter a response to the tag. Entering multiple responses will make them randomized.${i > 0 ? " Type `skip` to continue." : ""}`);

				response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
				if(response == "skip" && i > 0) done = true;
				else val.push(response);
			}
		} catch(e) {
			console.log(e);
			return msg.channel.createMessage("ERR: timed out. Aborting");
		}

		if(val.length == 0) return msg.channel.createMessage("ERR: No responses added. Aborting");

		var scc = await bot.utils.createTag(bot, msg.guild.id, name, val);
		if(scc) msg.channel.createMessage("Tag registered!");
		else msg.channel.createMessage("Something went wrong");
	},
	alias: ["create", "new", "+"],
	guildOnly: true,
	permissions: ["manageGuild"]
}

module.exports.subcommands.remove = {
	help: ()=> "Delete a custom response tag",
	usage: ()=> [" [tag name] - Deletes the given tag"],
	execute: async (bot, msg, args) => {
		var tag = await bot.utils.getTag(bot, msg.guild.id, args.join(" ").toLowerCase());
		if(!tag) return msg.channel.createMessage("Tag not found");

		var scc = await bot.utils.deleteTag(bot, tag.server_id, tag.name);
		if(scc) msg.channel.createMessage("Tag deleted!");
		else msg.channel.createMessage("Something went wrong");
	},
	alias: ["delete", "-"],
	guildOnly: true,
	permissions: ["manageGuild"]
}

module.exports.subcommands.info = {
	help: ()=> "Get info on a tag",
	usage: ()=> [" [tag name] - Gets info on the given tag"],
	execute: async(bot, msg, args) => {
		var tag = await bot.utils.getTag(bot, msg.guild.id, args.join(" ").toLowerCase());
		if(!tag) return msg.channel.createMessage("Tag not found");

		msg.channel.createMessage({embed: {
			title: "Tag: "+tag.name,
			description: `Responses: ${tag.value.length}/5`,
			fields: tag.value.map((t,i) => {
				return {name: `Response ${i+1}`, value: t}
			})
		}})
	}
}

module.exports.subcommands.edit = {
	help: ()=> "Edit a tag name or response",
	usage: ()=> [" [tag name] - Runs a menu to edit the given tag"],
	execute: async (bot, msg, args) => {
		var tag = await bot.utils.getTag(bot, msg.guild.id, args.join(" ").toLowerCase());
		if(!tag) return msg.channel.createMessage("Tag not found");

		var resp;
		var scc;
		await msg.channel.createMessage("Enter what you'd like to edit. Options: name, response")
		resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
		if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting");

		switch(resp[0].content.toLowerCase()) {
			case "name":
				await msg.channel.createMessage("Enter what you'd like the new name to be");
				resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting");
				var scc = await bot.utils.updateTag(bot, msg.guild.id, tag.name, "name", resp[0].content.toLowerCase());
				break;
			case "response":
			case "value":
				var done;
				var val = [];
				try {
					for(var i = 0; i < 5; i++) {
						if(done) break;
						await msg.channel.createMessage(`Response number: ${i+1}/5\nEnter a response to the tag. Entering multiple responses will make them randomized.${i > 0 ? " Type `skip` to continue." : ""}`);

						response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
						if(response == "skip" && i > 0) done = true;
						else val.push(response);
					}
				} catch(e) {
					console.log(e);
					return msg.channel.createMessage("ERR: timed out. Aborting");
				}
				if(val.length == 0) return msg.channel.createMessage("ERR: No responses added. Aborting");
				var scc = await bot.utils.updateTag(bot, msg.guild.id, tag.name, "value", val);
				break;
			default:
				return msg.channel.createMessage("ERR: invalid input. Aborting");
				break;
		}
		if(scc) msg.channel.createMessage("Successfully updated");
		else msg.channel.createMessage("Something went wrong");
	},
	alias: ["e", "change"],
	guildOnly: true,
	permissions: ["manageGuild"]
}