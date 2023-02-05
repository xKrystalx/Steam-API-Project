import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { ReactiveDict } from 'meteor/reactive-dict'
import { HTTP } from 'meteor/http';
import { Mongo } from 'meteor/mongo';
import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';

import bbobHTML from '@bbob/html'
import presetHTML5 from '@bbob/preset-html5'
 
import './body.html';

var suggestedContent = new Mongo.Collection(null);


Template.body.onCreated(function bodyOnCreated(){
    Session.set('isProcessing', false);
    Session.set('resultsReady', false);
});

Template.body.helpers({
    suggestion(){
        return suggestedContent.find({})[0];
    },

    state(){
        return {
            isProcessing: Session.get('isProcessing'),
            resultsReady: Session.get('resultsReady'),
        };
    }
});

Template.suggested_content.helpers({
    state(){
        return {
            isProcessing: Session.get('isProcessing'),
            resultsReady: Session.get('resultsReady'),
        };
    },
    suggestion(){
        return suggestedContent.findOne({});
    },

    aboutGame(){
        return suggestedContent.findOne({}).data.details.about_the_game;
    },

    checkReviewScore(x){
        console.log("xd");
        return suggestedContent.findOne({}).data.reviews.summary.review_score > x;
    },

    processBBCode(text){
        return bbobHTML(text, presetHTML5());
    }

})

Template.search_account.events({
    'click .search_account_btn'(event, instance){
        Session.set('isProcessing', true);
        Session.set('resultsReady', false);

        let steam_url = $("input[name='steam_url']")[0].value;
        console.log(steam_url);
        Meteor.call("processAccount", steam_url, (error, result) => {
            let data = result;
            console.log(data);

            suggestedContent = new Mongo.Collection(null);

            var xd = suggestedContent.insert({
             data
            }, function(){
                Session.set('resultsReady', true);
                Session.set('isProcessing', false);
            });
        });

    },
});