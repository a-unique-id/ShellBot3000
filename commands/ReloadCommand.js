const { Command } = require('discord-akairo');

class ReloadCommand extends Command {
    constructor() {
        super('reload', {
            aliases: ['reload'],
            ownerOnly: true,
            category: 'owner'
        });
    }

    async exec(message, args) {
        // `this` refers to the command object.
        await this.handler.reloadAll();
        return message.reply(`Reloaded commands`);
    }
}

module.exports = ReloadCommand;