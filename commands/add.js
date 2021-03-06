const { Command } = require('discord-akairo');
class tsadd extends Command {
    constructor() {
        super('tsadd', {
           aliases: ['tsadd','add'],
           channelRestriction: 'guild'
        });
    }
    
    async exec(message,args) {     
         //if(!( 
        //    message.channel.id === ts.channels.shellderShellbot  //only in bot-test channel
        //)) return false;
      try {

        let command=ts.parse_command(message);
        let code=command.arguments.shift()
        if(code)
          code=code.toUpperCase()

        if(!ts.valid_code(code))
          ts.userError("You did not provide a valid level code")

        const level_name=command.arguments.join(" ")

        if(!level_name)
          ts.userError("You didn't give a level name")

        await gs.loadSheets(["Raw Members","Raw Levels","Raw Played"]); //when everything goes through shellbot 3000 we can do cache invalidation stuff
        const player=ts.get_user(message);
        var existing_level=gs.select("Raw Levels",{"Code":code})

        if(existing_level)
          ts.userError("Level code has already been submitted as \""+existing_level["Level Name"]+"\" by "+existing_level.Creator);
        
        if(player.earned_points.available.toFixed(1)<0)
          ts.userError("You need "+Math.abs(player.earned_points.available).toFixed(1)+" points to upload a new level");

        await gs.insert("Raw Levels",{
          Code:code,
          "Level Name":level_name,
          Creator:player.Name,
          Difficulty:0,
          Approved:0
        })

        var reply="The level \""+level_name+"\" ("+code+") has been added"+ts.emotes.love
        message.channel.send(player.user_reply+reply)
      } catch (error) {
        message.reply(ts.getUserErrorMsg(error))
      }
    }
}
module.exports = tsadd;