'use strict'
const stringSimilarity = require('string-similarity')
var TS=function(gs,client){ //loaded after gs
var ts=this
this.valid_format=function(code){
  return /^[0-9A-Z]{3}-[0-9A-Z]{3}-[0-9A-Z]{3}$/.test(code.toUpperCase())
}

this.valid_code=function(code){
  return /^[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}-[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}-[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}$/.test(code.toUpperCase())
}

this.getEmoteUrl=function(emote){
  if(!emote) return ""
  let id=emote.split(":")[2].slice(0,-1)
  return "https://cdn.discordapp.com/emojis/"+id+"?v=100"
}

this.channels={}
this.emotes={}

//hard coded for now. 10.5 and 11 just in case
var validDifficulty=[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3,3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9,4,4.1,4.2,4.3,4.4,4.5,4.6,4.7,4.8,4.9,5,5.1,5.2,5.3,5.4,5.5,5.6,5.7,5.8,5.9,6,6.1,6.2,6.3,6.4,6.5,6.6,6.7,6.8,6.9,7,7.1,7.2,7.3,7.4,7.5,7.6,7.7,7.8,7.9,8,8.1,8.2,8.3,8.4,8.5,8.6,8.7,8.8,8.9,9,9.1,9.2,9.3,9.4,9.5,9.6,9.7,9.8,9.9,10,10.5,11,12];
this.valid_difficulty=function(str){ //whack code. 
  for(var i=0;i<validDifficulty.length;i++){
    if(validDifficulty[i]==str) return true
  }
  return false;
}

const static_vars=[
"TeamShell Variable","Points","TeamShell Ranks","Seasons","Emotes","Channels","tags","Competition Winners", //static vars
'Raw Members','Raw Levels','Raw Played' //play info
]; //initial vars to be loaded on bot load

this.pointMap=null

this.levelRemoved=function(level){
  return !level || level && level.Approved!="0" && level.Approved!="1"
}

this.load=async function(){
  this.pointMap={}
 this.channels={}
 this.emotes={}
 const response=await gs.loadSheets(static_vars) //loading initial sheets
  var _points=gs.select("Points");
  for(var i=0;i<_points.length;i++){
    this.pointMap[parseFloat(_points[i].Difficulty)]=parseFloat(_points[i].Points)
  }
  var _channels=gs.select("Channels");
  for(var i=0;i<_channels.length;i++){
    this.channels[_channels[i].Name]=_channels[i].value
  }
    var _emotes=gs.select("Emotes");
  for(var i=0;i<_emotes.length;i++){
    this.emotes[_emotes[i].Name]=_emotes[i].value
  }

  console.log("TS Vars loaded")
}

this.creator_str=function(level){
  var creator=gs.select("Raw Members",{"Name":level.Creator});
   if(creator && creator.atme=="1" && creator.discord_id){
     return "<@"+creator.discord_id+">"
    } else {
     return level.Creator
    }
}

this.embedAddLongField=function(embed,header,body){
  if(!header) header="\u200b"
  var bodyArr=body?body.split("."):[]
  var bodyStr=[""];
  for(var k=0,l=0;k<bodyArr.length;k++){
    if(bodyArr[k]){
    if( (bodyStr[l].length+bodyArr[k].length+1) > 980 ){
      l++
      bodyStr[l]=""
    }
      bodyStr[l]+=bodyArr[k]+"."
    }
  }
  for(var k=0;k<bodyStr.length;k++){
    embed.addField(header,bodyStr[k]);
    header = "\u200b"
  }
}

this.getExistingLevel=function(code){
  var level=gs.select("Raw Levels",{"Code":code})
   if(!level){ //level doesn't exist
    let notDeletedLevels={}
    gs.select("Raw Levels").forEach((level)=>{
      if(level && (level.Approved=="0" || level.Approved=="1")){
        notDeletedLevels[level.Code]=level.Code+" - \""+level["Level Name"]+"\" by "+level.Creator
      }
    })
    const match=stringSimilarity.findBestMatch(code,Object.keys(notDeletedLevels))
    if(match.bestMatch && match.bestMatch.rating>=0.6){
      var matchStr=" Did you mean:```\n"+notDeletedLevels[match.bestMatch.target]+"```"
    } else {
      var matchStr=""
    }
    
    ts.userError("The code `"+code+"` was not found in Team Shell's list."+matchStr);
   }
   if(!(level.Approved==0 || level.Approved==1)){ //level is removed. not pending/accepted
    ts.userError("The level \""+level["Level Name"]+"\" has been removed from Team Shell's list ");
  }
  return level
}

this.get_variable=function(var_name){
  var ret=gs.select("TeamShell Variable",{
    "Variable":var_name
  })
  return ret?ret.Value:false
}

this.levelsAvailable=function(points,levelsUploaded){
  var min=parseFloat(this.get_variable("Minimum Point"));
  var next=parseFloat(this.get_variable("New Level"));
  
  var nextLevel=levelsUploaded+1;
  var nextPoints= nextLevel==1? min : min+ (nextLevel-1)*next
  
  points=parseFloat(points);
  
  var pointsDifference=points-nextPoints;
  return pointsDifference
}

this.userError=function(errorStr){
  throw {
    "errorType":"user",
    "msg":errorStr
  }
}
this.getUserErrorMsg=function(obj){
  if(typeof obj=="object" && obj.errorType=="user"){
    return obj.msg+" "+this.emotes.think
  } else {
    console.error(obj)
    return "Something went wrong "+this.emotes.buzzyS
  }
}

this.get_user=function(message){
  var player=gs.select("Raw Members",{
    "discord_id":message.author.id
  })

  if(!player)
    ts.userError("You are not yet registered");

  if(player.banned)
    ts.userError("You have been barred from using this service")

  player.earned_points=this.calculatePoints(player.Name);
  player.rank=this.get_rank(player.earned_points.clearPoints);
  player.user_reply="<@"+message.author.id+">"+player.rank.Pips+" ";
  return player
}


this.judge=async function(levelCode){
  var guild=client.guilds.get(this.channels.guild_id)
  await gs.loadSheets(["Raw Levels", "Raw Members", "Shellder Votes"]);
  var level = ts.getExistingLevel(levelCode);
  const author = gs.select("Raw Members",{"Name":level.Creator});

  if(!author){
    ts.userError("Author was not found in Members List!")
  }

  //Get all current votes for this level
  var approvalVotes = gs.select("Shellder Votes",{"Code":levelCode, "Type": "approve"});   
  var rejectVotes = gs.select("Shellder Votes",{"Code":levelCode, "Type": "reject"});

  if(approvalVotes !== undefined && !Array.isArray(approvalVotes)){
    approvalVotes = [approvalVotes];
  } else if(!approvalVotes){
    approvalVotes = [];
  }
  if(rejectVotes !== undefined && !Array.isArray(rejectVotes)){
    rejectVotes = [rejectVotes];
  } else if(!rejectVotes) {
    rejectVotes = [];
  }

  //Count Approval and Rejection Votes
  var approvalVoteCount = approvalVotes.length;
  var rejectVoteCount = rejectVotes.length;

  if(rejectVoteCount >= ts.get_variable("VotesNeeded") && rejectVoteCount>approvalVoteCount){
    //Reject level
    var updateLevel = gs.query("Raw Levels", {
      filter: {"Code":levelCode},
      update: {"Approved": -2}
    });
    if(updateLevel.Code == levelCode){
      await gs.batchUpdate(updateLevel.update_ranges);
    }

    //Build embed
    var color="#dc3545";
    var title="Level was " + (level.Approved === "0" ? "rejected" : "removed") + "!";
    var image=this.getEmoteUrl(this.emotes.axemuncher);
    var voteComments=rejectVotes;

  } else if (approvalVoteCount >= ts.get_variable("VotesNeeded")  && approvalVoteCount>rejectVoteCount ){
    if(level.Approved !== "0")
      ts.userError("Level is not pending")
      //Get the average difficulty and round to nearest .5, build the message at the same time
      var diffCounter = 0;
      var diffSum = 0;
      for(var i = 0; i < approvalVotes.length; i++){
        var diff = parseFloat(approvalVotes[i].Difficulty);
        if(!Number.isNaN(diff)){
          diffCounter++;
          diffSum += diff;
        }
      }

      var finalDiff = Math.round((diffSum/diffCounter)*2)/2;

      //Only if the level is pending we approve it and send the message
      var updateLevel = gs.query("Raw Levels", {
        filter: {"Code":levelCode},
        update: {
          "Approved": "1",
          "Difficulty": finalDiff
        }
      });
      if(updateLevel.Code == levelCode){
        await gs.batchUpdate(updateLevel.update_ranges);
      }

      //Update author to set cult_member if they're not already. send initiate message and assign cult role
      if(author.cult_member !== "1"){
        var updateAuthor = gs.query("Raw Members", {
          filter: {"Name":author.Name},
          update: {
            "cult_member": "1"
          }
        });

        if(updateAuthor.Name == author.Name){
          await gs.batchUpdate(updateAuthor.update_ranges); //should combine the batch updates
          if(author.discord_id){
            var curr_user=await guild.members.get(author.discord_id)
            if(curr_user){ //assign role
              await curr_user.addRole(ts.channels.shellcult_id)
              await client.channels.get(ts.channels.initiateChannel).send("<a:ts_2:632758958284734506><a:ts_2:632758958284734506><a:ts_1:632758942992302090> <:SpigLove:628057762449850378> We welcome <@"+author.discord_id+"> into the shell cult <:PigChamp:628055057690132481> <a:ts_2:632758958284734506><a:ts_2:632758958284734506><a:ts_1:632758942992302090> <:bam:628731347724271647>")                        
            } else { 
              console.error(author.Name+" was not found in the discord") //not a breaking error.
            }
          }
        }
      }

      //Build Status Message
      var color="#01A19F";
      var title="This level was approved for difficulty: " + finalDiff + "!";
      var image=this.getEmoteUrl(this.emotes.bam);
      var voteComments=approvalVotes;
    } else {
      ts.userError("There must be at least "+ts.get_variable("VotesNeeded")+" Shellders in agreement before this level can be judged!");
    }
    
    var mention = "**<@" + author.discord_id + ">, we got some news for you: **";
    var exampleEmbed = ts.levelEmbed(level)
      .setColor(color)
      .setAuthor(title)
      .setThumbnail(image);

    for(var i = 0; i < voteComments.length; i++){
      var embedHeader=voteComments[i].Shellder + (voteComments[i].Difficulty?" voted " + voteComments[i].Difficulty:":")
      ts.embedAddLongField(exampleEmbed,embedHeader,voteComments[i].Reason)
    }

    await client.channels.get(ts.channels.shellderLevelChanges).send(mention);
    await client.channels.get(ts.channels.shellderLevelChanges).send(exampleEmbed);

    //if(client.util.resolveChannel())
  
    //Remove Discussion Channel
    var levelChannel=guild.channels.find(channel => channel.name === level.Code.toLowerCase())
    if(levelChannel){
      levelChannel.delete("Justice has been met!")
    }
}


this.levelEmbed=function(level,noLink){
  var videoStr=[]
  level["Clear Video"].split(",").forEach((vid,i)=>{
    if(vid) videoStr.push("[ 🎬 ]("+vid+")")
  })
  videoStr=videoStr.join(",")
  var tagStr=[]
  level.Tags.split(",").forEach((tag)=>{
    if(tag) tagStr.push("["+tag+"](https://teamshellsmm.github.io/levels/?tag="+encodeURIComponent(tag)+")")
  })
  tagStr=tagStr.join(",")
  var embed = client.util.embed()
      .setColor("#007bff")
      .setTitle(level["Level Name"] + " (" + level.Code + ")")
      .setDescription(
        "made by "+
        (noLink?level.Creator:"[" + level.Creator + "](https://teamshellsmm.github.io/levels/?creator=" + encodeURIComponent(level.Creator) + ")")+"\n"+
        (level.clears!=undefined ? "Difficulty: "+level.Difficulty+", Clears: "+level.clears+", Likes: "+level.likes+"\n":"")+
          (tagStr?"Tags: "+tagStr+"\n":"")+
          (videoStr?"Clear Video: "+videoStr:"")
       )
    if(!noLink){
      embed.setURL("https://teamshellsmm.github.io/levels/?code=" + level.Code)
    }

        //randomEmbed.addField(,);
   embed = embed.setTimestamp();
   return embed
}

this.parse_command=function(message){ //assumes there's prefix
  var raw_command=message.content.trim();
  raw_command=raw_command.split(" ");
  var sb_command=raw_command.shift().toLowerCase().substring(1);
  var filtered=[]
  raw_command.forEach((s)=>{
    if(s) filtered.push(s)
  })
  return {
    command:sb_command,
    arguments:filtered,
    argumentString:filtered.join(" "),
  }
}

this.get_levels=function(isMap){ //get the aggregates
    var clears={}
    gs.select("Raw Played").forEach((played)=>{
      if(!clears[played.Code]) clears[played.Code]={}
      clears[played.Code][played.Player]=played
    })
    var levels=isMap?{}:[]
    gs.select("Raw Levels").forEach((level)=>{
        var tsclears=0;
        var votesum=0;
        var votetotal=0;
        var likes=0;

        if(clears[level.Code]){
          for(var player in clears[level.Code]){
            if(player!=level.Creator){
              if(clears[level.Code][player].Completed=="1"){
                tsclears++;
              }
              if(clears[level.Code][player]["Difficulty Vote"]){
                votetotal++;
                votesum+=Number(clears[level.Code][player]["Difficulty Vote"])
              }
              if(clears[level.Code][player].Liked=="1"){
                likes++;
              }
            }
          }
        }
        level.clears=tsclears //no. of clears
        level.vote=votetotal>0? ((votesum/votetotal).toFixed(1)):0 //avg vote, num votes
        level.votetotal=votetotal
        level.likes=likes
        if(isMap){
          levels[level.Code]=level
        } else {
          levels.push(level)  
        }
    })
    return levels
}

this.get_rank=function(points){
  var point_rank=gs.select("TeamShell Ranks")
  for(var i=point_rank.length-1;i>=0;i--){
    if(parseFloat(points)>=parseFloat(point_rank[i]["Min Points"])){
      return point_rank[i]
    }
  }
  return false
}

this.calculatePoints=function(user,if_remove_check){ //delta check is to see if we can add a level if we remove it
   var currentLevels = gs.select("Raw Levels");
   var levelMap={};
   var ownLevels=[];
   var reuploads={};
   for (var row = currentLevels.length-1; row >=0 ; row--) {
     if(currentLevels[row].Approved=="1"){
       if(currentLevels[row].Creator==user){
         ownLevels.push(currentLevels[row].Code)
       } else {
         levelMap[currentLevels[row].Code]=this.pointMap[parseFloat(currentLevels[row].Difficulty)]  
       }
     } else if(currentLevels[row].Approved=="2") { //reupload
       if(currentLevels[row].Creator==user){
         //reuploads don't count for self
       } else {
         if(currentLevels[row].NewCode){
           reuploads[currentLevels[row].Code]=currentLevels[row].NewCode
           levelMap[currentLevels[row].Code]=this.pointMap[parseFloat(currentLevels[row].Difficulty)]
         }
       }
     } else if((currentLevels[row].Approved==null || currentLevels[row].Approved=="" || currentLevels[row].Approved=="0") && currentLevels[row].Creator==user){
       ownLevels.push(currentLevels[row].Code)
     }
      
   }
  
   var playedLevels = gs.select("Raw Played",{
      "Player":user,
      "Completed":"1"
   })
  
   var userCleared={};
   for (var row = 0; playedLevels && row < playedLevels.length; row++){
       var id= reuploads[playedLevels[row].Code] ? reuploads[playedLevels[row].Code] : playedLevels[row].Code
       userCleared[id]= Math.max( userCleared[id]?userCleared[id]:0, levelMap[playedLevels[row].Code] )
   }
  
  var clearPoints=0;
  for(var id in userCleared){
    if(userCleared[id]) clearPoints+=userCleared[id]
  }

   
  var ownLevelNumbers=ownLevels.length + (if_remove_check?-1:0) //check if can upload a level if we removed one. for reuploads
  return {
    clearPoints:clearPoints.toFixed(1),
    levelsMade:ownLevels.length,
    available:this.levelsAvailable(clearPoints,ownLevelNumbers),
  }
}


}

module.exports=TS