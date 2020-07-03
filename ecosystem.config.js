module.exports = {
  apps : [{
    name: 'herobrine',
    script: 'bot.js',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    instances: 1,
    autorestart: true,
    watch: ["bot.js", "config.json", "strings.json", "commands/", "utils/", "events/"],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
