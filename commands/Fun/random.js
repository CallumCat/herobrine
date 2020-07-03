module.exports = {
	help: ()=>"Gives a random number.",
	usage: ()=> [" <number> - Gives a number between 1 and 10, or the number provided."],
	execute: (bot, msg, args)=>{
		var max=(isNaN(args[0]) ? 10 : args[0]);
		var num=Math.floor(Math.random() * max);
		var nums=num.toString().split("");

		return "Your number:\n"+nums.map(n => ":"+bot.strings.numbers[eval(n)] + ":").join("");
	},
	module: "utility",
	alias: ["rand", "rng"]
}