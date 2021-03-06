const { Command } = require('discord-akairo');
class TSAddtags extends Command {
    constructor() {
        super('tsaddtags', {
           aliases: [
            'tsaddtags','addtags','tsaddtag','addtag',
            'tsremovetags','removetags','tsrmemovetag','removetag',
           ],
           channelRestriction: 'guild'
        });
    }
    
    async exec(message,args) {     
         //if(!( 
        //    message.channel.id === ts.channels.shellderShellbot  //only in bot-test channel
        //)) return false;
      try {
        const addCommands=['tsaddtags','addtags','tsaddtag','addtag']

        let command=ts.parse_command(message);
        let code=command.arguments.shift()
        if(code)
          code=code.toUpperCase()

        if(!ts.valid_code(code))
          ts.userError("You did not provide a valid level code")

        let new_tags=command.arguments.join(" ")   
        if(!new_tags)
          ts.userError("You didn't give any tags")
        new_tags=new_tags.split(/[,\n]/)
        
        await gs.loadSheets(["Raw Members","Raw Levels","Raw Played"]); //when everything goes through shellbot 3000 we can do cache invalidation stuff
      
  
        const player=ts.get_user(message);
        var level=ts.getExistingLevel(code)
        //First we get all available tags
        var all_tags = [];
        gs.select("Raw Levels").forEach((level)=>{
          if(level.Tags){
            level.Tags.split(",").forEach((tag)=>{
              if(all_tags.indexOf(tag)===-1)
                  all_tags.push(tag);
            })
          }
        });

        //Then we trim the new tags, check if they exist in all tags (lower cased, without spaces inbetween) and if they do we use that writing style instead
      for(var i = 0; i < new_tags.length; i++){
        new_tags[i] = new_tags[i].trim();
        all_tags.forEach((existing_tag)=>{
          if(new_tags[i].toLowerCase().replace(/[^a-z0-9]/g, "") == existing_tag.toLowerCase().replace(/[^a-z0-9]/g, "")){ //replacing space with all non alphanumeric characters
            new_tags[i] = existing_tag;
          }
        })
      }
        let filteredTags=new_tags
        let old_tags=level.Tags?level.Tags.split(","):[]


        if(addCommands.indexOf(command.command)!=-1){ //adding
          let locked_tags=[]
          gs.select("tags").forEach((tag)=>{
            if(tag && tag.add_lock){
              locked_tags.push(tag.Tag)
            }
          })

          new_tags=[]
          filteredTags.forEach((tag)=>{
            if(locked_tags.indexOf(tag)!=-1 && player.shelder!="1")
              ts.userError("You can't add the tag \""+tag+"\"")
            if(old_tags.indexOf(tag)==-1){
              new_tags.push(tag)
            }
          })
          if(new_tags.length==0)
            ts.userError("No new tags added for \""+level["Level Name"]+"\" by "+level.Creator+"\nCurrent tags:```\n"+old_tags.join("\n")+"```")
          old_tags=old_tags.concat(new_tags)
          var reply="Tags added for  \""+level["Level Name"]+"\" ("+code+")"+ts.emotes.bam+"\nCurrent tags:```\n"+old_tags.join("\n")+"```"
        } else { // removing
          if(!(level.Creator==player.Name || player.shelder=="1"))
            ts.userError("You can't remove tags from  \""+level["Level Name"]+"\" by "+level.Creator);

          let locked_tags=[]
          gs.select("tags").forEach((tag)=>{
            if(tag && tag.remove_lock){
              locked_tags.push(tag.Tag)
            }
          })


          new_tags=[]
          let notRemoved=true
          old_tags.forEach((tag)=>{
            if(locked_tags.indexOf(tag)!=-1 && player.shelder!="1")
              ts.userError("You can't remove the tag \""+tag+"\"")
            if(filteredTags.indexOf(tag)==-1){
              new_tags.push(tag)
            } else {
              notRemoved=false
            }
          })
          if(notRemoved)
            ts.userError("No tags have been removed for \""+level["Level Name"]+"\" ("+code+")\nCurrent Tags:```\n"+old_tags.join("\n")+"```")
          old_tags=new_tags
          var reply="Tags removed for  \""+level["Level Name"]+"\" ("+code+")"+ts.emotes.bam+"\nCurrent tags:```\n"+old_tags.join("\n")+"```"
        }


        level=gs.query("Raw Levels",{
          filter:{"Code":code},
          update:{"Tags":old_tags.join(",")},
        })

        await gs.batchUpdate(level.update_ranges)
        
        message.channel.send(player.user_reply+reply)
      } catch (error) {
        message.reply(ts.getUserErrorMsg(error))
      }
    }
}
module.exports = TSAddtags;