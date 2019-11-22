module.exports = {
	help: ()=>"Evaluate javascript code.",
	usage: ()=>[" [code] - Evaluates given code."," prm [code] - Evaluates given code, and any returned promises."],
	desc: ()=>"Only the bot owner can use this command.",
	execute: (bot, msg, args)=>{
		if(!bot.cfg.accepted_ids.includes(msg.author.id)){ return msg.channel.createMessage("Only the bot owner can use this command."); }
		try {
			const toeval = args.join(" ");
			let evld = eval(toeval);

			if(typeof(evld)!=="string"){
				evld=require("util").inspect(evld);
			}

			msg.channel.createMessage(bot.utils.cleanText(evld));
		} catch (err) {
			if(err){console.log(err)}
		};
	},
	module: "owner only",
	subcommands: {}
}

module.exports.subcommands.prm = {
	help: ()=> "Evaluates something that returns a promise.",
	usage: ()=> [" [code] - evaluate the code"],
	execute: (bot, msg, args)=>{
		if(!bot.cfg.accepted_ids.includes(msg.author.id)){ return msg.channel.createMessage("Only the bot owner can use this command."); }
		async function f(){
			var fn = new bot.AsyncFunction("bot", "msg", "args",`${args.join(" ")}`)
			try {
				let evlp = await fn.call(null, bot, msg, args);

				if(typeof(evlp)!=="string"){
					evlp=require("util").inspect(evlp);
				}

				msg.channel.createMessage(bot.utils.cleanText(evlp));
			} catch (err) {
				if(err){console.log(err)}
			}

		}

		f();
	},
	alias: ["p","prom"]
}