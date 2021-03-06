const { Command } = require('discord-akairo');
class TSClear extends Command {
    constructor() {
        super('tsclear', {
           aliases: ['tsclear','clear'],
            args: [{
                    id: 'code',
                    type: 'string',
                    default: ''
                },{
                    id: 'difficulty',
                    type: 'string',
                    default: ''
                },{
                    id: 'like',
                    type: 'string',
                    default: ''
                }],
           channelRestriction: 'guild'
        });
    }
    
    async exec(message,args) {
        try{
          args.code=args.code.toUpperCase();
          var command=ts.parse_command(message);
          var strOnly=false;

          if(!ts.valid_code(args.code))
            ts.userError("You did not provide a valid code for the level");

          if(args.like=="1" || args.like.toLowerCase()=="like"){
            args.like=1
          }

          if(args.difficulty.toLowerCase()=="like"){
            args.difficulty=''
            args.like=1
          }

          if(args.difficulty && !ts.valid_difficulty(args.difficulty)){
            ts.userError("You did not provide a valid difficulty vote");
          }
      
          await gs.loadSheets(["Raw Members","Raw Levels","Raw Played"]);
          const player=ts.get_user(message);

          //convert below to be function
          //call it in approve
          var level=ts.getExistingLevel(args.code)
          var existing_play=gs.select("Raw Played",{"Code":args.code,"Player":player.Name})
          if(existing_play && existing_play.Completed=="1")
            ts.userError("You have already submitted a clear for \""+level["Level Name"]+" by "+level.Creator)

          if(level.Creator==player.Name)
            ts.userError("You can't submit a clear for your own level")

          var creator=gs.select("Raw Members",{"Name":level.Creator});
          if(creator && creator.atme=="1" && creator.discord_id && !strOnly){
           var creator_str="<@"+creator.discord_id+">"
          } else {
           var creator_str=level.Creator
          }
          var row={
            "Code":args.code,
            "Player":player.Name,
            "Completed":"1",
            "Shelder":player.shelder,
            "Liked":args.like,
            "Difficulty Vote":args.difficulty,
            "Timestamp":gs.timestamp()
          }
          if(existing_play){
            var update=gs.query("Raw Played",{
              filter:{"Code":args.code,"Player":player.Name},
              update:row,
            })
            await gs.batchUpdate(update.update_ranges)
          } else {
            await gs.insert("Raw Played",row);
          }
 
          var msg=["You have cleared \""+level["Level Name"]+"\"  by "+creator_str+" "+ts.emotes.GG]
          if(args.difficulty)
            msg.push(" ‣You voted "+args.difficulty+" as the difficulty.");

          if(level.Approved=="1"){
            msg.push(" ‣You have earned "+ts.pointMap[parseFloat(level.Difficulty)]+" points.");     
          } else if(level.Approved=="0"){
            msg.push(" ‣This level is still pending.")
          }
          
          if(args.like){
           msg.push(" ‣You have also liked the level "+ts.emotes.love)
          }
          
            message.channel.send(player.user_reply+msg.join("\n"))
        } catch(error){
            message.reply(ts.getUserErrorMsg(error))
        }
    }
}
module.exports = TSClear;