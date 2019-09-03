module.exports = {
	hex2rgb: (hex)=>{
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
	        return r + r + g + g + b + b;
	    });

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
	        r: parseInt(result[1], 16),
	        g: parseInt(result[2], 16),
	        b: parseInt(result[3], 16)
	    } : null;
	},
	toLit: function(str,torep,repwith){
		if(str.indexOf(torep)!==-1){
			var repd=str.replace(torep,repwith);
			return eval('`'+repd+'`');
		} else {
			console.log("Nothing to replace.");
			return eval('`'+str+'`');
		}
	},
	cleanText: function(text){
		if (typeof(text) === "string") {
			return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
		} else	{
			return text;
		}
	},
	genCode: (num,table) =>{
		var codestring="";
		var codenum=0;
		while (codenum<(num==undefined ? 4 : num)){
			codestring=codestring+table[Math.floor(Math.random() * (table.length))];
			codenum=codenum+1;
		}
		return codestring;
	},
	randomText: function(table){
		var r=Math.floor(Math.random() * table.length);
		return table[r];
	},
	asyncForEach: async function(array,callback){
		console.log(array);
		console.log(array.length);
		for (let index = 0; index < array.length; index++) {
			console.log(array[index]);
			await callback(array[index], index, array);
		}
	},
	genEmbeds: async (bot, arr, genFunc, info = {}, fieldnum) => {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: info.title,
				description: info.description,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < (fieldnum || 10)) {
					current.embed.fields.push(await genFunc(arr[i], bot));
				} else {
					embeds.push(current);
					current = { embed: {
						title: info.title,
						description: info.description,
						fields: [await genFunc(arr[i], bot)]
					}};
				}
			}
			embeds.push(current);
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${arr.length} total)`;
			}
			res(embeds);
		})
	},

	//configs
	getConfig: async function(bot, srv){
		return new Promise((res)=> {
			bot.db.query(`SELECT * FROM configs WHERE srv_id='${srv}'`,
			{
				srv_id: String,
				prefix: String,
				welcome: JSON.parse,
				autoroles: String,
				disabled: JSON.parse,
				opped: String,
				feedback: JSON.parse,
				logged: JSON.parse,
				autopin: JSON.parse,
				aliases: JSON.parse
			},(err,rows)=>{
				if(err){
					console.log(err)
					res(undefined);
				} else {
					res(rows[0])
				}
			})
		})
	},
	updateConfig: async function(bot,srv,key,val) {
		return new Promise((res)=> {
			bot.db.query(`SELECT * FROM configs WHERE srv_id=?`,[srv], (err, rows)=> {
				if(err) {
					console.log(err);
				} else {
					if(!rows[0]) {
						bot.db.query(`INSERT INTO configs VALUES (?,?,?,?,?,?,?,?,?)`,[srv, "", {}, "", {}, "", {}, [], {}, []]);
					}
				}
			})
			bot.db.query(`UPDATE configs SET ?=? WHERE srv_id=?`,[key, val, srv], (err, rows)=> {
				if(err) {
					console.log(err);
					res(false)
				} else {
					res(true)
				}
			})
		})
	},

	//commands
	isDisabled: async function(bot, srv, cmd, name){
		return new Promise(async res=>{
			var cfg = await this.getConfig(bot, srv);
			if(!cfg || !cfg.disabled) return res(false);
			let dlist = cfg.disabled;
			name = name.split(" ");
			if(dlist.commands && (dlist.commands.includes(name[0]) || dlist.commands.includes(name.join(" ")))) {
				res(true);
			} else {
				res(false);
			}

		})
	},
	checkPermissions: async function(bot, msg, cmd){
		return new Promise((res)=> {
			if(cmd.permissions) {
				console.log(cmd.permissions.filter(p => msg.member.permission.has(p)).length)
				if(!cmd.permissions.filter(p => msg.member.permission.has(p)).length == cmd.permissions.length) {
					res(false);
					return;
				}
				res(true);
			} else {
				res(true);
			}
		})
	},
	
	//starring
	starMessage: async function(bot, msg, channel, data) {
		var attach = [];
		if(msg.attachments[0]) {
			await Promise.all(msg.attachments.map(async (f,i) => {
				var att = await bot.fetch(f.url);
				attach.push({file: Buffer.from(await att.buffer()), name: f.filename});
				return new Promise(res => {
					setTimeout(()=> res(1), 100);
				})
			}))
		}
		var embed = {
			author: {
				name: `${msg.author.username}#${msg.author.discriminator}`,
				icon_url: msg.author.avatarURL
			},
			footer: {
				text: msg.channel.name
			},
			description: (msg.content || "*(image only)*") + `\n\n[Go to message](https://discordapp.com/channels/${msg.channel.guild.id}/${msg.channel.id}/${msg.id})`,
			timestamp: new Date(msg.timestamp)
		}
		bot.createMessage(channel, {content: `${data.emoji.includes(":") ? `<${data.emoji}>` : data.emoji} ${data.count}`,embed: embed}, attach ? attach : null).then(message => {
			bot.db.query(`INSERT INTO starboard (server_id, channel_id, message_id, original_id, emoji) VALUES (?,?,?,?,?)`,[
				message.guild.id,
				message.channel.id,
				message.id,
				msg.id,
				data.emoji
			])
		});
	},
	updateStarPost: async (bot, server, msg, data) => {
		return new Promise((res) => {
			bot.db.query(`SELECT * FROM starboard WHERE original_id=? AND server_id=? AND emoji=?`,[msg, server, data.emoji], (err, rows) => {
				if(err) {
					console.log(err);
					res(false)
				} else {
					var post = rows[0];
					if(!post) return res(true);
					try {
						bot.editMessage(post.channel_id, post.message_id, `${data.emoji.includes(":") ? `<${data.emoji}>` : data.emoji} ${data.count}`)
					} catch(e) {
						console.log(e);
						return res(false);
					}
					res(true);
					
				}
			})
		})
	},
	getStarPost: async (bot, server, msg, emoji) => {
		return new Promise((res) => {
			bot.db.query(`SELECT * FROM starboard WHERE server_id=? AND original_id=? AND emoji=?`,[server, msg, emoji], (err, rows) => {
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					res(rows[0]);
				}
			})
		})
	},

	//react roles
	getReactionRoles: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactroles WHERE server_id=?`,[id],(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows);
				}
			})
		})
	},
	getReactionRole: async (bot, id, role) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactroles WHERE server_id=? AND role_id=?`,[id, role],(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	getReactionRolesByCategory: async (bot, serverid, categoryid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=? AND hid=?`,[serverid, categoryid], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse
			}, async (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					if(rows[0].roles) {
						var roles = [];
						await Promise.all(rows[0].roles.map((r,i) => {
							return new Promise(res2 => {
								bot.db.query(`SELECT * FROM reactroles WHERE id=?`,[r], (err, rls)=> {
									roles[i] = rls[0]
								});
								setTimeout(()=> res2(''), 100)
							})
						})).then(()=> {
							res(roles)
						})
					} else {
						res(undefined);
					}

				}
			})
		})
	},
	deleteReactionRole: async (bot, id, role) => {
		return new Promise(async res => {
			var rr = await bot.utils.getReactionRole(bot, id, role);
			if(!rr) return res(true);

			bot.db.query(`DELETE FROM reactroles WHERE server_id = ? AND role_id = ?`,[id, rr.role_id], (err, rows) => {
				if(err) {
					console.log(err);
					res(false)
				} else {
					console.log("Deleted role")
					res(true)
				}
			});

			var cats = await bot.utils.getReactionCategorieswithRole(bot, id, rr.id);
			if(cats) {
				var scc = await bot.utils.updateReactionCategories(bot, id, cats.map(c => c.hid), "remove", rr.id);
				if(!scc) return res(false);
			}

			var posts = await bot.utils.getReactPostswithRole(bot, id, rr.role_id);
			if(posts) {
				var scc2 = await bot.utils.updateReactPosts(bot, id, posts.map(p => p.message_id), "remove", rr.role_id);
				if(!scc2) return res(false);
			}
		})
	},

	//react posts
	genReactPosts: async (bot, roles, msg, info = {}) => {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: info.title,
				description: info.description,
				fields: []
			}, roles: [], emoji: []};
			
			for(let i=0; i<roles.length; i++) {
				if(current.embed.fields.length < 10) {
					var rl = msg.guild.roles.find(x => x.id == roles[i].role_id);
					if(rl) {
					 	current.embed.fields.push({name: `${rl.name} (${roles[i].emoji.includes(":") ? `<${roles[i].emoji}>` : roles[i].emoji})`, value: roles[i].description || "*(no description provided)*"});
					 	current.roles.push({role_id: roles[i].role_id, emoji: roles[i].emoji});
					 	current.emoji.push(roles[i].emoji);
					}
				} else {
					embeds.push(current);
					current = { embed: {
						title: info.title,
						description: info.description,
						fields: []
					}, roles: [], emoji: []};
					var rl = msg.guild.roles.find(x => x.id == roles[i].role_id);
					if(rl) {
					 	current.embed.fields.push({name: `${rl.name} (${roles[i].emoji.includes(":") ? `<${roles[i].emoji}>` : roles[i].emoji})`, value: roles[i].description || "*(no description provided)*"});
					 	current.roles.push({role_id: roles[i].role_id, emoji: roles[i].emoji});
					 	current.emoji.push(roles[i].emoji);
					}
				}
			}
			embeds.push(current);
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += ` (part ${i+1}/${embeds.length})`;
			}
			res(embeds);
		})
	},
	getReactPosts: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactposts WHERE server_id = ?`, [id],
			{
				id: Number,
				server_id: String,
				channel_id: String,
				message_id: String,
				roles: JSON.parse,
				page: Number
			},(err, rows)=> {
				if(err) {
					console.log(err);
					return res(undefined)
				} else {
					if(rows[0]) res(rows);
					else res(undefined);
				}
			})
		})
	},
	getReactPost: async (bot, id, postid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactposts WHERE server_id=? AND message_id=?`,[id, postid],{
				id: Number,
				server_id: String,
				channel_id: String,
				message_id: String,
				roles: JSON.parse,
				page: Number
			},(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	getReactPostswithRole: async (bot, id, role) => {
		return new Promise(async res => {
			var posts = await bot.utils.getReactPosts(bot, id);
			if(posts) posts = posts.filter(r => r.roles.filter(rl => rl.role_id == role)[0]);
			if(posts) res(posts);
			else res(undefined);
		})
	},
	updateReactCategoryPosts: async (bot, id, msg, categoryid) => {
		return new Promise(async res => {
			var cat = await bot.utils.getReactionCategory(bot, id, categoryid);
			if(!cat) return res(false);
			if(!cat.posts || !cat.posts[0]) return res(true);
			var roles = await bot.utils.getReactionRolesByCategory(bot, msg.guild.id, cat.hid);
			if(!roles) return res(false);
			if(roles.length == 0) {
				await Promise.all(cat.posts.map(async p => {
					var pst = await bot.utils.getReactPost(bot, id, p);
					if(!pst) return Promise.resolve("")
					var message = await bot.getMessage(pst.channel_id, pst.message_id);
					if(!message) return Promise.resolve("")
					await message.delete();
					bot.db.query(`DELETE FROM reactposts WHERE server_id = ? AND message_id=?`, [
						message.guild.id,
						message.id
					], (err, rows)=> {
						if(err) console.log(err);
					})

				}))
			} else if(roles.length <= 10) {
				await Promise.all(cat.posts.map(async p => {
					var pst = await bot.utils.getReactPost(bot, id, p);
					if(!pst) return Promise.resolve("")
					var message = await bot.getMessage(pst.channel_id, pst.message_id);
					if(!message) return Promise.resolve("")
					if(pst.page > 0) return await message.delete();
					console.log(pst.page);

					bot.editMessage(message.channel.id, message.id, {embed: {
						title: cat.name,
						description: cat.description,
						fields: roles.map(r => {
							var rl = msg.guild.roles.find(x => x.id == r.role_id);
							return {name: `${rl.name} (${r.emoji.includes(":") ? `<${r.emoji}>` : r.emoji})`, value: r.description || "*(no description provided)*"}
						})
					}}).then(message => {	
						var emoji = roles.map(r => r.emoji);
						var oldreacts = Object.keys(message.reactions)
										.filter(rr => message.reactions[rr].me)
										.filter(rr => !emoji.includes(rr) && !emoji.includes(":"+rr));
						emoji.forEach(rc => message.addReaction(rc));
						oldreacts.forEach(rc => message.removeReaction(rc.replace(/^:/,"")));

						bot.db.query(`UPDATE reactposts SET roles = ?, page=? WHERE server_id = ? AND message_id=?`,[
							roles.map(r => {return {emoji: r.emoji, role_id: r.role_id}}),
							0,
							message.guild.id,
							message.id
						], (err, rows)=> {
							if(err) console.log(err);
						})
					}).catch(e => {
						console.log(e);
						res(false)
					})

				}))
			} else {
				var posts = await bot.utils.genReactPosts(bot, roles, msg, {
					title: cat.name,
					description: cat.description
				})
				await Promise.all(cat.posts.map(async p => {
					var pst = await bot.utils.getReactPost(bot, id, p);
					if(!pst) return Promise.resolve("");
					var message = await bot.getMessage(pst.channel_id, pst.message_id);
					if(!message) return Promise.resolve("");
					bot.editMessage(message.channel.id, message.id, {embed: posts[pst.page].embed}).then(message => {	
						var emoji = posts[pst.page].emoji;
						var oldreacts = Object.keys(message.reactions)
										.filter(rr => message.reactions[rr].me)
										.filter(rr => !emoji.includes(rr) && !emoji.includes(":"+rr));
						emoji.forEach(async rc => message.addReaction(rc));
						oldreacts.forEach(rc => message.removeReaction(rc.replace(/^:/,"")));


						bot.db.query(`UPDATE reactposts SET roles = ? WHERE server_id = ? AND message_id=?`,[
							posts[pst.page].roles,
							message.guild.id,
							message.id
						], (err, rows)=> {
							if(err) console.log(err);
						})
					}).catch(e => {
						console.log(e);
						res(false)
					})

				}))
			}
			
			res(true);
		})
	},
	updateReactPosts: async (bot, id, msgs, action, data) => {
		return new Promise(async res => {
			await Promise.all(msgs.map(m => {
				return new Promise(async res2 => {
					var post = await bot.utils.getReactPost(bot, id, m);
					if(action && action == "remove") {
						post.roles = post.roles.filter(x => x.role_id != data);
						bot.db.query(`UPDATE reactposts SET roles = ? WHERE server_id = ? AND message_id = ?`,[post.roles, id, m]);
					}
					try {
						await bot.utils.updateReactPost(bot, id, m)
					} catch(e) {
						console.log(e);
					}
					setTimeout(()=> res2(), 100);
				})
			})).then(()=> {
				res(true);
			})
		})
	},
	updateReactPost: async (bot, id, msg) => {
		return new Promise(async res => {
			var post = await bot.utils.getReactPost(bot, id, msg);
			if(!post) return res(true);
			var message = await bot.getMessage(post.channel_id, post.message_id);
			if(!message) return res(false);

			console.log(post.roles);
			if(post.roles.length == 0) {
				await message.delete();
				bot.db.query(`DELETE FROM reactposts WHERE server_id = ? AND message_id = ?`,[id, msg],(err, rows) => {
					if(err) {
						console.log(err);
						res(false);
					} else {
						res(true);
					}
				})
			} else {
				var curembed = message.embeds[0];
				var roles = [];
				await Promise.all(post.roles.map(rl => {
					return new Promise(async res2 => {
						var r = await bot.utils.getReactionRole(bot, id, rl.role_id);
						var r2 = message.channel.guild.roles.find(x => x.id == rl.role_id);
						roles.push({name: `${r2.name} (${r.emoji})`, description: r.description || "*(no description provided)*", emoji: r.emoji});
						res2('');
					})
				}))
				console.log(roles);
				await bot.editMessage(post.channel_id, post.message_id, {embed: {
					title: curembed.title,
					description: curembed.description,
					fields: roles.map(r => { return {name: r.name, value: r.description}})
				}}).then(async (message)=> {
					var emoji = roles.map(r => r.emoji);
					var oldreacts = await Object.keys(message.reactions)
									.filter(rr => message.reactions[rr].me)
									.filter(rr => !emoji.includes(rr) && !emoji.includes(":"+rr));
					bot.utils.asyncForEach(emoji, async rc => await message.addReaction(rc));
					bot.utils.asyncForEach(oldreacts, async rc => await message.removeReaction(rc.replace(/^:/,"")));
				}).catch(e => {
					console.log(e);
					res(false)
				})
			}
		})
	},
	getHighestPage: async (bot, id, hid) => {
		return new Promise(async res => {
			var category = await bot.utils.getReactionCategory(bot, id, hid);
			if(!category) return res(false);
			bot.db.query(`SELECT MAX(page) AS max FROM reactposts WHERE message_id IN (${category.posts.join(", ")})`, (err, rows) => {
				if(err) {
					console.log(err);
					res(false)
				} else {
					console.log(rows[0].max)
					res(rows[0].max)
				}
			})
		})
	},
	deleteReactPost: async (bot, id, msg) => {
		return new Promise(async res => {
			var categories = await bot.utils.getReactionCategories(bot, id);
			
			bot.db.query(`BEGIN TRANSACTION`);
			categories.forEach(cat => {
				bot.db.query(`UPDATE reactcategories SET posts = ? WHERE hid = ? AND server_id = ?`, [cat.posts.filter(x => x != msg), cat.hid, id]);
			})
			bot.db.query(`DELETE FROM reactposts WHERE server_id = ? AND message_id = ?`,[id, msg]);
			bot.db.query(`COMMIT`);

			return res(true);
		})
	},

	//react categories
	getReactionCategories: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=?`,[id], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse,
				posts: JSON.parse
			}, (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows);
				}
			})
		})
	},
	getReactionCategory: async (bot, id, categoryid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=? AND hid=?`,[id, categoryid], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse,
				posts: JSON.parse
			}, (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	getReactionCategorieswithRole: async (bot, id, role) => {
		console.log("grabbing categories...")
		return new Promise(async res => {
			var categories = await bot.utils.getReactionCategories(bot, id);
			if(categories) categories = categories.filter(c => c.roles.includes(role));
			if(categories) res(categories);
			else res(undefined);
		})
	},
	updateReactionCategories: async (bot, id, hids, action, data) => {
		return new Promise(async res => {
			console.log(hids);
			await Promise.all(hids.map(m => {
				return new Promise(async res2 => {
					var cat = await bot.utils.getReactionCategory(bot, id, m);
					if(action && action == "remove") {
						cat.roles = cat.roles.filter(x => x != data);
						console.log("Updating category "+m);
						bot.db.query(`UPDATE reactcategories SET roles = ? WHERE server_id = ? AND hid = ?`,[cat.roles, id, m]);
					}
					setTimeout(()=> res2(), 100);
				})
			})).then(()=> {
				res(true);
			})
		})
	},
	deleteReactionCategory: async (bot, id, categoryid) => {
		return new Promise(async res => {
			var category = await bot.utils.getReactionCategory(bot, id, categoryid);
			if(!category) return res("true");
			console.log(category);
			category.posts.map(async p => {
				var post = await bot.utils.getReactPost(bot, id, p);
				console.log(post);
				if(!post) return null;
				try {
					bot.deleteMessage(post.channel_id, post.message_id);
				} catch(e) {
					console.log(e)
				}
				bot.db.query(`DELETE FROM reactposts WHERE server_id=? AND message_id=?`,[id, p]);
			})
			bot.db.query(`DELETE FROM reactcategories WHERE server_id=? AND hid=?`,[id, categoryid]);
			res(true);
		})
	}
};