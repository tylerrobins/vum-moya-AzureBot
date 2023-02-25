const axios = require('axios');
require('dotenv').config({ path: './.env'})
const { InputHints, MessageFactory } = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const INCEPTION_DIALOG = 'inceptionDialog';
const TEXT_PROMPT = 'textPrompt';

class InceptionDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'inceptionDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog(INCEPTION_DIALOG, [
                this.coverOptionStep.bind(this),
                this.businessNameStep.bind(this),
                this.businessPinLocationStep.bind(this),
                this.inceptionDateStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = INCEPTION_DIALOG;
    }

    async coverOptionStep(stepContext) {
        console.log("STARTING AGAIN")
        const clientDetails = stepContext.options;
        
        if (!clientDetails.coverOption) {
            const messageText = 'Please select a Cover Option?\n\nA - Starter\n\nB - Standard\n\nC - Premium';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.coverOption);
    }

    async businessNameStep(stepContext) {
        const clientDetails = stepContext.options;
        
        clientDetails.coverOption = stepContext.result;
        if (!clientDetails.businessName) {
            const messageText = 'Please enter your business name.';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.businessName);
    }

    async businessPinLocationStep (stepContext) {
        const clientDetails = stepContext.options;

        clientDetails.businessName = stepContext.result;
        if (!clientDetails.businessLocation.pincoords) {
            const messageText = 'Please provide your business pin location.';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.businessLocation.pincoords);
    }

    async inceptionDateStep (stepContext) {
        const clientDetails = stepContext.options;
        if (!clientDetails.businessLocation.pincoords || !clientDetails.businessLocation.googlePlus || !clientDetails.businessLocation.what3Words) {
            const googleMapsData = await getAPIData("https://maps.googleapis.com/maps/api/geocode/json",`latlng=${stepContext.result}`,"key=AIzaSyAOsCoUnJLbldWCDjmeISoL5YwIaWzGGkU");
            const what3WordsData = await getAPIData("https://api.what3words.com/v3/convert-to-3wa",`coordinates=${stepContext.result}`,"key=MVIU0YCZ");
            
            clientDetails.businessLocation = {
                pincoords: clientDetails.businessLocation.pincoords,
                googlePlus:googleMapsData.plus_code.global_code,
                what3Words:what3WordsData.words,
                address: {
                    street:googleMapsData.results[0].address_components[1].long_name,
                    suburb: googleMapsData.results[0].address_components[2].long_name,
                    area:googleMapsData.results[0].address_components[3].long_name,
                    province:googleMapsData.results[0].address_components[5].long_name,
                    postalCode:googleMapsData.results[0].address_components[6].long_name,                
                }
            };
        }

        if (!clientDetails.inceptionDate) {
            const messageText = 'Please provide your chosen inception date in the format yyyy-mm-dd';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.inceptionDate);
    }


    async finalStep(stepContext) {
        const clientDetails = stepContext.options;
        const inceptionDateValidation = await validateDateInput(stepContext.result);
        console.log(`INCEPTION DATE VALIDATION: ${inceptionDateValidation}`);
        if (inceptionDateValidation !== true) {
            console.log("IF STATEMENT")
            const messageText = inceptionDateValidation;
            const msg = MessageFactory.text(messageText, messageText, InputHints.IgnoringInput);
            await stepContext.context.sendActivity(msg);
            console.log(`clientDetails: ${JSON.stringify(clientDetails)}`)
            return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        clientDetails.inceptionDate = stepContext.result;
        return await stepContext.endDialog(clientDetails);
    }
}

/**
 * Fetches data from the API enpoint and returns the data
 @params endpoint - the API enpoint with no parameters
 @params args - the parameters to be passed to the endpoint
 */
async function getAPIData(endpoint,...args) { 
    let parameters = "";
    for (let i = 0; i < args.length; i++) {
        parameters += "&" + args[i];
    }
    const endpointUrl = `${endpoint}?${parameters}`;
    try {
        const response = await axios.get(endpointUrl);
        return response.data;
    } catch (error) {
        console.log(error);
    }
  }

async function validateDateInput(dateString) {
    // Regular expression used to check if date is in correct format
    // The date string must be in the format yyyy-mm-dd
    console.log(`DATE STRING: ${dateString}`)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateString)) {
      return "INVALID DATE FORMAT";
    }
    // The date must be a valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }   
    // The date must be today or later
    const now = new Date();
    if (date < now.setHours(0, 0, 0, 0)) {
      return "Must be today or later";
    }   
    // The month and day must be valid
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    if (month < 1 || month > 12){
      return "Please provide a valid month";
    }
    if (day < 1 || day > daysInMonth){
        return "Please provide a valid day";
    }
    if (year < 2020 || year > 2100 ){
        return "Please provide a valid year";
    }
    return true;
}

module.exports.InceptionDialog = InceptionDialog;