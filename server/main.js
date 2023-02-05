import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import {GamesInfo} from '../imports/api/games.js';
// import {UpdateInfo} from '../imports/api/updateInfo.js';

Meteor.startup(() => {
  const dotenv = require('dotenv').config({ path: require('find-config')('.env') });

  // let updateDB = UpdateInfo.findOne({
  //   id: 0
  // });

  // console.log(updateDB);
  // if(!updateDB){
  //   UpdateInfo.insert({
  //     id: 0,
  //     lastUpdate: Date.now()/1000
  //   }, function(){
  //     updateDB = this;
  //     updateDatabase();
  //   });
  // }
  // else{
  //   //Update if a week has passed since last update
  //   if((Date.now()/1000) - updateDB.lastUpdate >= 0 ){
  //     updateDatabase();
  //   }
  //   else{
  //     let date = new Date(updateDB.lastUpdate*1000 + 604800*1000);
  //     console.log("[Info] Next update attempt: " + date.toString());
  //   }
  // }
});

Meteor.methods({
  processAccount(steam_url){
    var steamid = null;
    var regex = new RegExp('^https*://steamcommunity.com/id/.*');
    if(regex.test(steam_url)){
      let regexIdRoute = new RegExp('^.*id\/(.*[^\/])')
      let vanityName = regexIdRoute.exec(steam_url)[1];
      console.log('[Info] Looking up: ' + vanityName);
      try{
        let res = HTTP.call('GET', 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/', {
          params: {
            key: process.env.API_KEY,
            vanityurl: vanityName
          }
        });

        steamid = res.data.response.steamid;
        console.log("[Info] Client's Steam ID: " + steamid);
      }
      catch (e){
        //TODO Error
        return;
      }
    }
    else{
      console.log('[Info] Extracting Steam ID from URL: ' + steam_url);
      let regexProfilesRoute = new RegExp('^.*profiles\/(\\d{17})');
      steamid = regexProfilesRoute.exec(steam_url)[1];
      console.log("[Info] Client's Steam ID: " + steamid);


      console.log('[Info] Requesting list of games for ' + steamid);
    }

    var suggestion = null;
    try {
      let res = HTTP.call('GET', 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
        params: {
          key: process.env.API_KEY,
          steamid: steamid,
          include_appinfo: true
        }
      });
      let json = JSON.parse(res.content).response;
      suggestion = generateSuggestions(json.games);
    }
    catch(e){
      console.log("Error");
      let res = {
        success: false,
        errorMessage: "Invalid Steam ID or profile is not set to Public"
      };
      return res;
    }

    var suggestedGameInfo = null;
    try{
      let res = HTTP.call('GET', 'https://store.steampowered.com/api/appdetails', {
        params:{
            appids: suggestion.appid,
        }
      });

      if(res.statusCode == 200){
        suggestedGameInfo = JSON.parse(res.content)[suggestion.appid].data;
      }
    }
    catch(e){
      return;
    }

    var suggestedGameReviews = {
      summary: null,
      positive: null,
      negative: null,
    };
    try{
      let res = HTTP.call('GET', 'https://store.steampowered.com/appreviews/'+suggestion.appid, {
        params:{
            language: "all",
            purchase_type: "all",
            json: 1,
        }
      });
  
      if(res.statusCode == 200){
        suggestedGameReviews.summary = JSON.parse(res.content).query_summary;
      }
    }
    catch(e){
      return;
    }
    try{
      let res = HTTP.call('GET', 'https://store.steampowered.com/appreviews/'+suggestion.appid, {
        params:{
            review_type: 'positive',
            language: "english",
            purchase_type: "all",
            day_range:"all",
            num_per_page: 5,
            json: 1,
        }
      });
  
      if(res.statusCode == 200){
        suggestedGameReviews.positive = JSON.parse(res.content).reviews;
      }
    }
    catch(e){
      return;
    }

    try{
      let res = HTTP.call('GET', 'https://store.steampowered.com/appreviews/'+suggestion.appid, {
        params:{
            review_type: 'negative',
            language: "english",
            purchase_type: "all",
            day_range:"all",
            num_per_page: 5,
            json: 1,
        }
      });
  
      if(res.statusCode == 200){
        suggestedGameReviews.negative = JSON.parse(res.content).reviews;
      }
    }
    catch(e){
      return;
    }

    if(suggestion != null && suggestedGameInfo != null && suggestedGameReviews.summary != null){
      let data = {
        appid: suggestion.appid,
        playtime_forever: suggestion.playtime_forever,
        details: suggestedGameInfo,
        reviews: suggestedGameReviews,
      };
      return data;
    }
  },

})

function generateSuggestions(gamesList){
  let len = gamesList.length;
  let rand = getRandomInt(0, len);
  return gamesList[rand];
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// function getGamesInfo(applist){
//   for(let app of applist){
//     console.log("[Info] Downloading AppID: " +app.appid)
//     HTTP.call('GET', 'https://store.steampowered.com/api/appdetails/',{
//       params:{
//         appids: app.appid,
//         filters: 'steam_appid,name,categories,genres',
//         format: 'json'
//       }},
//       (error, result) => {
//         if(!error){
//           let id = app.appid;
//           let data = JSON.parse(result.content);
//           console.log(data);
//           GamesInfo.insert({
//             appid: app.appid,
//             data: data.id.data,
//           });
//         }
//         else{
//           console.log("[Error] Error downloading info..." + result.statusCode);
//         }
//       }
//     );
//     // UpdateInfo.update({
//     //   id:0
//     // },{
//     //   lastUpdate: Date.now()/1000,
//     // });
//     //await sleep(1000);
//     sleep(1000);
//   }
// }

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

// async function updateDatabase(){
//   console.log("[Info] Updating database...");
//   HTTP.call('GET', 'https://api.steampowered.com/ISteamApps/GetAppList/v1/', {
//     params:{
//       key: process.env.API_KEY,
//       include_games: 1,
//       format: 'json',
//     }},  
//     (error, result) => {
//       if(!error){
//         let applist = JSON.parse(result.content).applist.apps;
//         console.log("[Info] App count: " + Object.keys(applist).length);
//         updateGamesInfo(applist);
//       }
//       else{

//       }
//     }
//   );
// }

