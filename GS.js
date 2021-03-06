'use strict'
const request = require('request-promise')
const { google } = require("googleapis");
const querystring = require("querystring");


var GS=function(config){
  let jwtClient = new google.auth.JWT(
         config.client_email,
         null,
         config.private_key,
         ["https://spreadsheets.google.com/feeds"]
  );

  let google_auth=null
  async function get_token(){
    if (!(google_auth && google_auth.expiry_date > +new Date())){
      google_auth=await jwtClient.authorize()
    }
    return google_auth
  }

  this.lastUpdated=null
  this.timestampVarName="Timestamp"
  this.timestamp=function(){
    return Math.floor(Date.now() / 1000) //seconds epoch
  }

  let json_header={}
  let SheetCache={} //not sure if I need a mutex here or not
  let ArrayCache={}

  this.getHeaders=function(){
    return json_header
  }

  this.getArrayFormat=function(sheets){
  var SheetCache={}
  sheets.forEach((sheet)=>{
    var range=sheet.split('!')
      var sheet_name=range[0].replace(/'/g,'')
    SheetCache[sheet_name]=this.getArray(sheet)
  })
  return SheetCache
}

  this.getArray=function(range){
    range=range.replace(/\\/g,'').split('!')
    var sheet_name=range[0].replace(/'/g,'')
    var sheet=JSON.parse(ArrayCache[sheet_name])
    if(sheet && range[1]&&range[1].length==1){
      var rangeLength=range[1].charCodeAt(0)-64
      for(var i=0;i<sheet.length;i++){
        sheet[i]=sheet[i].slice(0,rangeLength)
      }
    }
    return sheet
  }

  this.loadSheets=async function(ranges){ //input is sheets to be loaded. load to cache to be stored
    try {
    let authClient=await get_token()
    ranges=ranges?ranges.join("&ranges="):""
    let url = "https://sheets.googleapis.com/v4/spreadsheets/"+config.spreadsheetId+"/values:batchGet?ranges="+ranges
    const response=await request( {
      url: url,
      method: 'GET',
      headers:{
        Authorization: 'Bearer ' + authClient.access_token
      },
      gzip: true
    })
    var returnData={}
    let data=JSON.parse(response)
    this.lastUpdated=this.timestamp()

    if(data.valueRanges){
      for(var i=0;i<data.valueRanges.length;i++){
        var range=data.valueRanges[i].range.split("!")
        range=range[0].replace(/'/g,'')
        ArrayCache[range]=JSON.stringify(data.valueRanges[i].values)
        var header=data.valueRanges[i].values.shift()
        json_header[range]=header;
        returnData[range]=[]
        for(var j=0;j<data.valueRanges[i].values.length;j++){
          var row={}
          for(var k=0;k<header.length;k++){
            row[header[k]]=data.valueRanges[i].values[j][k]
          }
          row["GS_sheet_name"]=range
          row["GS_row_id"]=(j+1); //for r1c1. header is r1
          returnData[range].push(row)
        }
        SheetCache[range]=returnData[range]
      }
    }
    return returnData
    } catch (error){
      console.error(error)
    }
  }

  //need to load 
  this.select=function(sheet,filter,forceArray){
    return this.query(sheet,{
      filter:filter
    },forceArray)
  }
  
  this.query=function (sheet,parameters,forceArray){ //may break if column named updated or row
    try{
    var querySheet = SheetCache[sheet]
    if(!querySheet) throw "No cached sheet found"
    var headers=json_header[sheet];
    
    var header_to_id={}
    for(var i=0;i<headers.length;i++){
      header_to_id[headers[i]]=i;
    } 
    
    if(parameters && parameters.filter){
      var filter=function(row){
        var matched=true;
        for(var f in parameters.filter){
          if(row[f]!=parameters.filter[f]) matched=false;
        }
        return matched;
      }
    } else {
        var filter=function(){return true;}
    }

    var ret=[]
    for (var row = 0; row < querySheet.length; row++){
      if(filter(querySheet[row])){
        var obj=querySheet[row]
        var updated={}
        if(parameters && parameters.update){
          var data=[]
          for(var u in parameters.update){
            if(obj[u]!=parameters.update[u]){
              data.push({ 
                range: r1c1(sheet,querySheet[row]["GS_row_id"],header_to_id[u]),
                values: [[parameters.update[u]]]
              })
              updated[u]=true;
            } else {
              updated[u]=false; 
            }
          }
          
          if(data){
            obj.update_ranges=data
          }
        }
        obj.updated=updated
        ret.push(obj)  
      }
    } 
    if(forceArray)
      return ret;

    return (ret.length>1) ? ret : ret[0];
    } catch (error){
      console.error(error)
    }
  }


  function r1c1(sheet,r,c){ //A1 = R1C1
    return "'"+sheet+"'!r"+(r+1)+"c"+(c+1);
  }

  

  this.insert =async function(sheet,pData){
    try {
    var header=json_header[sheet];
    if(!sheet) throw "No sheet selected";
    if(!header) throw "Sheet has not been loaded or doesn't exist";
    if(!pData) throw "Passed data must not be null";
    let url = "https://sheets.googleapis.com/v4/spreadsheets/"+config.spreadsheetId+"/values/"+encodeURI("'"+sheet+"'")+":append?insertDataOption=INSERT_ROWS&valueInputOption=USER_ENTERED"
    var new_row=[],hasData=false;
    for(var i=0;i<header.length;i++){
      var cur_col=pData[header[i]]
      if(cur_col===undefined || cur_col===null){
        cur_col=''
      }
      if(!cur_col && header[i]==this.timestampVarName){
        cur_col=this.timestamp();
      }
      if(cur_col) hasData=true;
      new_row.push(cur_col);
    }

    if(!hasData) throw "There was no valid data given for this sheet";

    var data={
      "values":[new_row]
    }

    let authClient=await get_token()
    const response=await request( {
      url: url,
      method: 'POST',
      headers:{
        Authorization: 'Bearer ' + authClient.access_token
      },
      gzip: true,
      body: JSON.stringify(data)
    });
    
    return response
    } catch(error){
      console.error(error)
    }

  }

  //store batchUpdates in a cache then run batchUpdate to save changes?
  this.batchUpdate=async function(ranges){ //for ease of use format will be strictly r1c1
    try {
    let url="https://sheets.googleapis.com/v4/spreadsheets/"+config.spreadsheetId+"/values:batchUpdate"
    var data={
      "valueInputOption": "USER_ENTERED",
      "data": ranges,
      "includeValuesInResponse": false
    }

    let authClient=await get_token()
    const response=await request( {
      url: url,
      method: 'POST',
      headers:{
        Authorization: 'Bearer ' + authClient.access_token
      },
      gzip: true,
      body: JSON.stringify(data)
    })
    return response
    } catch(error){
      console.error(error)
    }
  }
}

module.exports=GS