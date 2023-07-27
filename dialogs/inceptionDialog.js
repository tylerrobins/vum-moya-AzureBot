const axios = require('axios');
const { InputHints, MessageFactory} = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const os = require('os');

// DEBUG MODE VARIABLES
const { debug, webAppEndpoint } = debugMode();

const INCEPTION_DIALOG = 'inceptionDialog';
const GENERAL_DIALOG = 'generalDialog';
const MAIN_DIALOG = 'mainDialog';
// const GENERAL_DIALOG = 'generalDialog';
const AWAITING_PAYMENT_DIALOG = 'awaitingPaymentDialog';
const TEXT_PROMPT = 'textPrompt';

const moyaPayToken = process.env.MOYA_PAY_TOKEN;
const vumAPIKey = process.env.VUM_API_KEY;

class InceptionDialog extends CancelAndHelpDialog {
    constructor(id, userState, conversationState) {
        super(id, userState, conversationState);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog(INCEPTION_DIALOG, [
                // this.moyaPayCheckStep.bind(this),
                this.coverOptionStep.bind(this),
                this.firstNameStep.bind(this),
                this.lastNameStep.bind(this),
                this.citizenshipStep.bind(this),
                this.foreignCitizenStep.bind(this),
                this.idNumberStep.bind(this),
                this.tradingNameStep.bind(this),
                this.businessNameStep.bind(this),
                this.businessPinLocationStep.bind(this),
                this.inceptionDateStep.bind(this),
                this.confirmStep.bind(this),
                this.checkDataChange.bind(this),
                this.finalStep.bind(this)
            ]));
        this.initialDialogId = INCEPTION_DIALOG;
    };

    // DON'T NEED MOYA PAY CHECK STEP AS PAY@ IS NOW ADDED
    // async moyaPayCheckStep(stepContext) {
    //     // console.log the chat particapant's id
    //     const clientDetails = stepContext.options;

    //     console.log(`Result of !clientDetails.moyaPay : ${!clientDetails.moyaPay}`)
    //     // if(!clientDetails.businessActivity) {
    //     //     stepContext.context('Please start the process by going to the Business Insurance Tile in the Moya App');
    //     //     return await stepContext.endDialog();
    //     // }
    //     await stepContext.context.sendActivity('Thank you for you interest in our product, we have the following Cover Options available to you:\n\nStarter - R75\n- Stock and Contents: R30 000\n- Personal Accident: R25 000\n- Political Riot: R500 000\n\nStandard - R125\n- Stock and Contents: R50 000\n- Personal Accident: R25 000\n- Cell phone cover: R2 500\n- Political Riot: R500 000\n\nPremium - R195\n- Stock and Contents: R100 000\n- Personal Accident: R50 000\n- Cell phone cover: R5 000\n- Political Riot: R500 000\n\n');
    //     console.log("MoyaPay: undefined or empty if statement")
    //     switch(clientDetails.moyaPay) {
    //         case 1:
    //             const messageText1 = 'At the moment this product is exclusive to MoyaPay users. Your MoyaPay account is currently being verified, once your account has been opened you will be able to continue the policy inception process.';
    //             const msg1 = MessageFactory.text(messageText1, messageText1, InputHints.ExpectingInput);
    //             return await stepContext.prompt(TEXT_PROMPT, { prompt: msg1 });
    //             // stepContext.context.sendActivity('At the moment this product is exclusive to MoyaPay users. Your MoyaPay account is currently being verified, once your account has been opened you will be able to continue the policy inception process.');
    //             // return await stepContext.endDialog();
    //         case 2:
    //             return await stepContext.next(clientDetails.moyaPay);
    //         default:
    //             const messageText0 = 'We are sorry, but at the moment this product is exclusive to MoyaPay users. You can easily open a MoyaPay account by tapping here: moya://moya.payd or tap on the (?) button in MoyaPay for help with opening your account.';
    //             const msg0 = MessageFactory.text(messageText0, messageText0, InputHints.ExpectingInput);
    //             return await stepContext.prompt(TEXT_PROMPT, { prompt: msg0 });
    //     }
    // };

    async coverOptionStep(stepContext) {
        console.log("=========================\nCOVER OPTION STEP")
        const clientDetails = stepContext.options;
        // REMOVED AS THE MOYA PAY CHECK STEP IS NO LONGER IN USE
        // const result = stepContext.result;
        // Check the results, of MoyaPay check step
        // switch (result) {
        //     case 0:              
        //         return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        //     case 1:
        //         return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        //     case 2:
        //         console.log("\nMOYA PAY STATUS 2\n")
        //         break;
        //     case 'start chat':
        //         console.log(`\nSTART CHAT\n`)
        //         return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        //     default:
        //         return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        // }

        // Set payment type
        if (clientDetails.moyaPay === 2) {
            clientDetails.paymentType = 'MoyaPay';
        } else {
            clientDetails.paymentType = 'Pay@';
        }
        if (!clientDetails.coverOption) {
            const messageText = 'Please select a Cover Option?\nA - Starter\nB - Standard\nC - Premium';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
            }
        console.log("LAST STEP IN COVER OPTION STEP")
        return await stepContext.next(clientDetails.coverOption);
    };

    async firstNameStep(stepContext) {
        // console.log("FIRST NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        // Check the results, of Cover Option step
        switch(result.toLowerCase()) {
            case 'a':
            case 'A':
            case 'starter':
            case 'Starter':
                clientDetails.coverOption = 'Starter';
                clientDetails.premium_incl_sasria  = 75;
                clientDetails.premium_nett_incl_sasria = 65.22;
                clientDetails.premium_vat_incl_sasria = 9.78;
                clientDetails.premium_excl_sasria = 70;
                clientDetails.premium_nett_excl_sasria = 60.87;
                clientDetails.premium_vat_excl_sasria = 9.13;
                break;
            case 'b':
            case 'B':
            case 'standard':
            case 'Standard':
                clientDetails.coverOption = 'Standard';
                clientDetails.premium_incl_sasria = 125;
                clientDetails.premium_nett_incl_sasria = 108.70;
                clientDetails.premium_vat_incl_sasria = 16.30;
                clientDetails.premium_excl_sasria = 120;
                clientDetails.premium_nett_excl_sasria = 104.35;
                clientDetails.premium_vat_excl_sasria = 15.65;
                break;
            case 'c':
            case 'C':
            case 'premium':
            case 'Premium':
                clientDetails.coverOption = 'Premium';
                clientDetails.premium_incl_sasria = 195;
                clientDetails.premium_nett_incl_sasria = 169.57;
                clientDetails.premium_vat_incl_sasria = 25.43;
                clientDetails.premium_excl_sasria = 190;
                clientDetails.premium_nett_excl_sasria = 165.22;
                clientDetails.premium_vat_excl_sasria = 24.78;
                break;
            case 'start chat':
                console.log(`\nSTART CHAT\n`)
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            default:
                await stepContext.context.sendActivity("Please select a valid option\n\n");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        if (!clientDetails.firstName) {
            const messageText = 'Please provide your first name?';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.firstName);
    };

    async lastNameStep(stepContext) {
        // console.log("LAST NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        clientDetails.firstName = result;

        if (!clientDetails.lastName){
            const messageText = 'Please provide your last name?';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.lastName);
    };

    async citizenshipStep(stepContext) {
        // console.log("CITIZENSHIP STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        clientDetails.lastName = result;

        if (!clientDetails.citizenship) {
            const messageText = 'Please select your citizenship?\nA - South African\nB - Other';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.citizenship);
    };

    async foreignCitizenStep(stepContext) {
        // console.log("FOREIGN CITIZEN STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        switch(result.toLowerCase()) {
            case 'a':
            case 'true':
            case 'south african':
            case 'sa':
            case 'za':
                clientDetails.citizenship = 'South African';
                clientDetails.southAfricanCitizen = 'true';
                break;
            default:
                clientDetails.southAfricanCitizen = 'false';
                break;
        }
        if (clientDetails.southAfricanCitizen === 'false' && !clientDetails.citizenship){
            const messageText = 'Please provide your country of citizenship?';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.citizenship);
    };

    async idNumberStep(stepContext) {
        // console.log("ID NUMBER STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        clientDetails.citizenship = result;
        if (!clientDetails.idNumber) {
            if(clientDetails.southAfricanCitizen === 'true') {
                const messageText = 'Please provide your ID number?';
                const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
                return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
            } else {
                const messageText = 'Please provide your passport number?';
                const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
                return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
            }
        }
        return await stepContext.next(clientDetails.idNumber);
    };

    async tradingNameStep(stepContext) {
        // console.log("TRADING NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        clientDetails.idNumber = result;
        if (!clientDetails.hasTradingName) {
            const messageText = 'Do you have a business trading name?\nA - Yes\nB - No';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.hasTradingName);
    };

    async businessNameStep(stepContext) {
        // console.log("BUSINESS NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;

        switch(result.toLowerCase()) {
            case 'a':
            case 'true':
            case true:
                clientDetails.hasTradingName = 'true';
                break;
            case 'b':
            case 'false':
            case false:
                clientDetails.hasTradingName = 'false';
                clientDetails.businessName = `${clientDetails.firstName} ${clientDetails.lastName}`;
                break;
            default:
                await stepContext.context.sendActivity("Please select a valid option");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        if (!clientDetails.businessName) {
            const messageText = 'Please enter your business trading name?';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.businessName);
    };

    async businessPinLocationStep (stepContext) {
        // console.log("BUSINESS PIN LOCATION STEP")
        const clientDetails = stepContext.options;
        clientDetails.businessName = stepContext.result;
        if (!clientDetails.pinCoords) {
            const messageText = 'Please provide your business location by sending a pin location in this chat.';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.pinCoords);
    };

    async inceptionDateStep (stepContext) {
        // console.log("INCEPTION DATE STEP")
        const clientDetails = stepContext.options;
        const extractPinCoords = await validateCoordinates(stepContext.result);
        if(!extractPinCoords) {
            await stepContext.context.sendActivity('The pin location you have provided is invalid, please send a pin from ');
            return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        } else {
            clientDetails.pinCoords = String(extractPinCoords);
        }

        if (!clientDetails.inceptionDate) {
            const today =  new Date();
            let tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            const currentDate = formatString(today);
            const tomorrowDate = formatString(tomorrow);
            if (today.getMonth() == 11) {
                var firstNextMonth = new Date(today.getFullYear() + 1, 0, 1);
            } else {
                var firstNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            }
            firstNextMonth = formatString(firstNextMonth);
            const messageText = `Please choose the date you would like your Policy to start:\nA - Today (${currentDate})\nB - Tomorrow (${tomorrowDate})\nC - The 1st of Next Month (${firstNextMonth})`;
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.inceptionDate);
    };

    async confirmStep(stepContext) {
        // console.log("CONFIRM STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        if (!clientDetails.inceptionDate) {
            const today =  new Date();
            switch(result.toLowerCase()) {
                case "a":
                    clientDetails.inceptionDate = formatString(today);
                    break;
                case "b":
                    let tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    clientDetails.inceptionDate = formatString(tomorrow);
                    break;
                case "c":
                    if (today.getMonth() == 11) {
                        var firstNextMonth = new Date(today.getFullYear() + 1, 0, 1);
                    } else {
                        var firstNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    }
                    clientDetails.inceptionDate = formatString(firstNextMonth);
                    break;
                case "":
                    // Do Nothing
                    break;
                default:
                    if (isValidDate(result)){
                        clientDetails.inceptionDate = result;
                        break;
                    } else {
                        await stepContext.context.sendActivity("Please select a valid option.");
                        return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
                    }
                }
        }
        const messageText = `Please confirm the following information:\n\nCover Option: ${clientDetails.coverOption}\nFirst Name: ${clientDetails.firstName}\nLast Name: ${clientDetails.lastName}\nCitizenship: ${clientDetails.citizenship}\nID/Passport Number: ${clientDetails.idNumber}\n${clientDetails.hasTradingName === 'true' ?'Business Name: ' + clientDetails.businessName + '\n':''}Inception Date: ${clientDetails.inceptionDate}\n\nA - Correct Information\nB - Incorrect Information`;
        const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
    };

    async checkDataChange(stepContext) {
        // console.log("CHECK DATA CHANGE")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        switch (result.toLowerCase()) {
            case "a":
                return await stepContext.next(clientDetails);
            case "b":
                const messageText = `Please indicate the incorrect information:\nA - Cover Option\nB - First Name\nC - Last Name\nD - Citizenship\nE - ID/Passport Number\nF - Inception Date\n${clientDetails.hasTradingName === 'true' ?'G - Business Name':''}`
                const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
                return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
            default:
                await stepContext.context.sendActivity("Please select a valid option.");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
    };

    async finalStep(stepContext) {
        // console.log("FINAL STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        if(!isObject(result)){
            switch (result.toLowerCase()) {
                case "a":
                    clientDetails.coverOption = null;
                    break;
                case "b":
                    clientDetails.firstName = null;
                    break;
                case "c":
                    clientDetails.lastName = null;
                    break;
                case "d":
                    clientDetails.citizenship = null;
                    break;
                case "e":
                    clientDetails.idNumber = null;
                    break;
                case "f":
                    clientDetails.inceptionDate = null;
                    break;
                case "g":
                    clientDetails.businessName = null;
                    clientDetails.hasTradingName = null;
                    console.log(`CLIENT DETAILS BUSINESS NAME CHECK ${!clientDetails.businessName}`)
                    break;
                default:
                    await stepContext.context.sendActivity("Please select a valid option.");
                    return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            }
            console.log(`UPDATED CLIENT DETAILS: ${JSON.stringify(clientDetails)}`)
            return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        clientDetails.dataPopulated = true;
        clientDetails.hasTradingName = clientDetails.hasTradingName.toString()
        console.log(`\n\nCLIENT DATA: ${JSON.stringify(clientDetails)}\n\n`);
        let populated_data_result = await VUMWebAppPostRequest(webAppEndpoint, clientDetails)
        console.log(`POPLUATED DATA RESULT: ${JSON.stringify(populated_data_result)}`)
        clientDetails.pro_rata = populated_data_result.data.pro_rata;
        clientDetails.premium_due = populated_data_result.data.premium_due;
        clientDetails.policyNumber = populated_data_result.data.policyNumber;
        let proRataText = "";
        if (clientDetails.pro_rata) {
            proRataText = `initial premium and pro-rata amount of R${clientDetails.premium_due} has been paid.`;
        } else {
            proRataText = `initial premium of R${clientDetails.premium_due} has been paid.`;
        }
        await stepContext.context.sendActivity(`Thank you for choosing us for your Business Insurance needs. Your application for cover has been processed and is successful, your application number is ${clientDetails.policyNumber}.\nPlease note that cover only becomes Active when the ${proRataText}`);
        if(clientDetails.paymentType == "Moya Pay") {
            return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG, clientDetails);
        } else {
            return await stepContext.beginDialog(GENERAL_DIALOG, clientDetails);
        }
    };
}

async function VUMWebAppPostRequest(endpoint, data, retries = 3) {
  return new Promise(async (resolve, reject) => {
    const url = endpoint + data.rowKey;
    console.log(`URL CREATED: ${url}`);
    for(let i = 0; i < retries; i++) {
      try {
        const response = await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vumAPIKey}`,
          },
        });

        // if the post request is successful, resolve the promise with response data
        return resolve(response.data);
      } catch (error) {
        console.error('Error while making the POST request to VUM Web App');
        // If it's the last attempt, reject the promise
        if(i === retries - 1) {
            console.log(`Error: ${error}`)
            return reject(error);
        }
        // Else log the attempt and continue the loop for the next attempt
        console.error(`Attempt ${i + 1} failed, retrying...`);
      }
    }
  });
}


async function validateCoordinates(str) {
    let coords;
    const pinRegex = /^([-0-9.]+),\s*([-0-9.]+)$/;
    const geoRegex = /^geo:([-0-9.]+),([-0-9.]+)/;
  
    if (pinRegex.test(str)) {
      coords = str.match(pinRegex).slice(1).map(parseFloat);
    } else if (geoRegex.test(str)) {
      coords = str.match(geoRegex).slice(1).map(parseFloat);
    } else {
      return false;
    }
  
    return coords;
}

function formatString(dateParam) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
    let day = dateParam.getDate();
    let month = monthNames[dateParam.getMonth()];
    let year = dateParam.getFullYear();
    // This arrangement can be altered based on how we want the date's format to appear.
    return `${day}-${month}-${year}`
}

function isObject(value) {
    return typeof value === 'object' && value !== null && !(value instanceof Array);
}

function isValidDate(dateString) {
    // Convert date to a format the Date object can parse
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateParts = dateString.split('-');
    const monthIndex = months.indexOf(dateParts[1]) + 1;
    if (monthIndex === 0) {
        return false; // month name not found
    }
    const normalizedDate = `${monthIndex < 10 ? '0' + monthIndex : monthIndex}-${dateParts[0]}-${dateParts[2]}`;
    
    // Check if it's a valid date
    const timestamp = Date.parse(normalizedDate);
    return !isNaN(timestamp);
}

function debugMode(){
    let debug = process.env.DEBUG_MODE;
    let webAppEndpoint;
    // Checking to make sure that debug isn't running while not in local host
    if (os.hostname() === "localhost" || os.hostname() === "127.0.0.1" || os.hostname() === "Kingsley-PC") {
        debug = process.env.DEBUG_MODE === "true" ? true: false;
    } else {
        debug = false;
    }
    webAppEndpoint = debug ? process.env.DEBUG_WEB_APP_ENDPOINT : process.env.WEB_APP_ENDPOINT;
    return {debug, webAppEndpoint}
}

module.exports.InceptionDialog = InceptionDialog;