// LEVEL and INFLUENCE logging for activity audit

exports.run = async (client, message, args, level) => { 

  args = args.map(function(x){ return x.toLowerCase() });

  const moment = require("moment"),
        table = require('easy-table'),
        today = moment().startOf('day').valueOf(); 
  
  var targetID = message.author.id,
      searchObj = message.guild,
      hasData = false,
      dataTable = new table,
      msg = "Updating",
      action = false,
      lvl = 0,
      inf = 0,
      ts = 0,
      noActivityUsers1 = new Array(),
      noActivityUsers2 = new Array(),
      noActivityUsers3 = new Array();
      //log = client.activityDB.get(targetID) || new Object(),
      
  
  
  for (var i = 0; i < args.length; i++) {
    
    //if (args[i] === "x" && args[i+1] > 0)  //TESTING-MODE
        //today = moment().subtract(args[++i], 'days').startOf('day').valueOf()

    if ((args[i] === "level" || args[i] === "lvl") && args[i+1] > 0)
        lvl = Number(args[++i]);

    else if ((args[i] === "influence" || args[i] === "inf" || args[i] === "info") && args[i+1] > 0)
        inf = Number(args[++i]);

    else if ((args[i] === "techscore" || args[i] === "ts") && args[i+1] > 0)
        ts = Number(args[++i]);

    else if (args[i].indexOf("<@&") >= 0 ) {
      let roleID = args[i].replace(/[^0-9]/g,"");
      if (!message.guild.roles.has(roleID))
        return message.reply("Role not found! Maybe i can't mention it...");
      searchObj = message.guild.roles.get(roleID);
    }
    else if (args[i].indexOf("<@") >= 0) {
      if (level > 1)
        targetID = args[i].replace(/[^0-9]/g,"");
      else
        return message.reply("Only a moderator or higer can use !activity on other people.");
    }
    else if (["audit", "history"].includes(args[i]))
        action = args[i];
  }
  
  if (action === "audit"){
    let range = moment().subtract(args[1] > 0 ? args[1] : 7, 'days').valueOf();
    msg = "Audit from "+moment(range).fromNow()+"\n";
    //client.logger.debug("range:"+moment(range).format('YYYY MM DD'));
    
    searchObj.members.forEach(function (tag, targetID){
      if (client.activityDB.has(targetID)) {
        let mostRecentDay = false,
            pastDay = false,
            log = client.activityDB.get(targetID);
        
        //client.logger.debug(":member:"+targetID+":"+JSON.stringify(log))

        mostRecentDay = Math.max(...Object.keys(log))
        if ( mostRecentDay < range ) {
          noActivityUsers1.push(client.getDisplayName(targetID, message.guild));
          return; //next member
        }

        pastDay = Object.keys(log).reduce(function(prevVal, element) {
          return element < range ? Math.max(prevVal, element) : prevVal;
        }, 0);

        if ( !pastDay ) {
          noActivityUsers2.push(client.getDisplayName(targetID, message.guild));
          return; //next member
        }
        
        //client.logger.debug("past:"+moment(pastDay).format('YYYY MM DD')+"|recent:"+moment(mostRecentDay).format('YYYY MM DD'))

        hasData=true;
        dataTable.cell('User', client.getDisplayName(targetID, message.guild).substr(0,15));
        dataTable.cell('Lvl Diff', log[mostRecentDay].lvl - log[pastDay].lvl);
        dataTable.cell('Inf Diff', log[mostRecentDay].inf - log[pastDay].inf);
        dataTable.cell('TS Diff', log[mostRecentDay].ts - log[pastDay].ts);
        dataTable.newRow();
      }
      else
        noActivityUsers3.push(client.getDisplayName(targetID, message.guild));

    });    
    if (hasData)
      message.channel.send(msg+ "```" + dataTable.sort(['User|asc']).toString()+"```");

    if (noActivityUsers1.length > 0)
      message.channel.send("Users without RECENT log: `"+noActivityUsers1.sort().join("`, `")+"`");
    if (noActivityUsers2.length > 0)
      message.channel.send("Users without PAST log: `"+noActivityUsers2.sort().join("`, `")+"`");
    if (noActivityUsers3.length > 0)
      if (noActivityUsers3.length > 10)
        message.channel.send("More than 10 users have no data log at ALL");
      else
        message.channel.send("Users without ANY log: `"+noActivityUsers3.sort().join("`, `")+"`");
    
    return;
  }
  
  if (action === "history"){
    if (client.activityDB.has(targetID)) {
      let log = client.activityDB.get(targetID);
      Object.keys(log).forEach(date => {
        dataTable.cell('Date', moment(Number(date)).format('YYYY MM DD'));
        dataTable.cell('Level', log[date].lvl);
        dataTable.cell('Influence', log[date].inf);
        dataTable.cell('TechScore', log[date].ts);
        dataTable.newRow();
      });
      return message.channel.send("History for "+client.getDisplayName(targetID, message.guild)+"```" + dataTable.sort(['Date|des']).toString()+"```");
    }
  }
  
  var log = client.activityDB.get(targetID) || new Object();
  client.logger.debug("target:"+targetID+":today:"+today);
  if (!log.hasOwnProperty(today)) {
    let lastDay = Math.max(...Object.keys(log)) || false;
    log[today] = log[lastDay] || {lvl: 0, inf: 0, ts: 0};
    client.logger.debug("lastday:"+lastDay+":"+JSON.stringify(log[lastDay]));
  }
  client.logger.debug("today..:"+today+":"+JSON.stringify(log[today]));

  //===============================================================================================================//
  client.logger.debug(".in log:"+JSON.stringify(log));

  if (ts === 0) {
    if (client.hsTech.has(targetID)) {
      let allTech = client.hsTech.get(targetID);
      Object.keys(allTech).forEach(function(techID) {
        if (client.config.hadesTech[techID]) 
          ts += client.config.hadesTech[techID].levels[Number(allTech[techID]-1)] || 0;
      });
    }
  }
  
  if (lvl > 0) {
    log[today].lvl = lvl;
    msg += " Level to "+ lvl;
  }
  if (inf > 0) {
    log[today].inf = inf;
    msg += " Influence to "+ inf;
  }
  if (ts > 0) {
    log[today].ts  = ts;
    msg += " TechScore to "+ ts;
  }

  client.logger.debug("out log:"+JSON.stringify(log));

//output: [2018-06-02 04:44:54]: DEBUG .in log:{"1526947200000":{"lvl":60,"inf":2893,"ts":423},"1527120000000":{"lvl":66,"inf":3049,"ts":425},"1527552000000":{"lvl":66,"inf":3049,"ts":425},"1527897600000":{"lvl":66,"inf":3049,"ts":425}} 
//output: [2018-06-02 04:44:54]: DEBUG out log:{"1526947200000":{"lvl":60,"inf":2893,"ts":423},"1527120000000":{"lvl":66,"inf":3049,"ts":425},"1527552000000":{"lvl":69,"inf":2800,"ts":1420},"1527897600000":{"lvl":69,"inf":2800,"ts":1420}} 

//===============================================================================================================//

  client.logger.debug("Doing "+(action || "set/get")+" on date: "+moment(today).format("DD/MMM/YYYY")+" to: "+client.getDisplayName(targetID, message.guild).substr(0,15)+" ::"+JSON.stringify(log[today]));

  if(msg !== "Updating") {
    client.activityDB.set(targetID, log);
    client.logger.debug("write: "+targetID+"::"+JSON.stringify(log));
    message.reply(msg);
  }
  else
    message.channel.send(client.getDisplayName(targetID, message.guild)+" current activity for today is: Level "+log[today].lvl+", Influence "+log[today].inf+", TechScore "+log[today].ts);
  
  
}

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["act"],
  permLevel: "user"
};

exports.help = {
  name: "activity",
  category: "Hades Star",
  description: "Update activity record for the day.",
  usage: `activity [lvl n] [inf n] [audit n] [history]
- - - - - - - - - - - - - - - - - -
Examples:
• !act lvl 100 inf 6000
• !act lvl 55
• !act inf 3000
• !act audit (standard audit, 7 days)
• !act audit 5 (5 days audit)
• !act history
- - - - - - - - - - - - - - - - - -
For TESTING purposes this command will allow you to update in the PAST, specifying the number of days to the past: activity [x n] [lvl n] [inf n]
Example:
 . !act x 5 lvl 10 inf 2000 (sets 5 days ago)
 'x' must be the first argument, followed by the number of days.`
};
