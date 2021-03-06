const { Command } = require('discord-akairo');


class tsinfo extends Command {
    constructor() {
        super('tsinfo', {
           aliases: ['tsinfo','info','level'],
            args: [{
                    id: 'code',
                    type: 'string',
                    default: ''
                }],
           channelRestriction: 'guild'
        });
    }
    
    async exec(message,args) {     
         //if(!( 
        //    message.channel.id === ts.channels.shellderShellbot  //only in bot-test channel
        //)) return false;
      try {

        args.code=args.code.toUpperCase();
        if(!ts.valid_format(args.code))
          ts.userError("You did not provide a valid format for the level");

        await gs.loadSheets(["Raw Members","Raw Levels","Raw Played"]); //when everything goes through shellbot 3000 we can do cache invalidation stuff
        const player=ts.get_user(message);
        var level=ts.getExistingLevel(args.code)

        var randomEmbed=ts.levelEmbed(level)

        await message.channel.send(player.user_reply)
        await message.channel.send(randomEmbed)
      } catch (error) {
        message.reply(ts.getUserErrorMsg(error))
      }
    }
}
module.exports = tsinfo;