const axios = require('axios');
const { InputHints, MessageFactory} = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol  } = require("@azure/storage-blob");
const { PDFDocument } = require('pdf-lib');

const fs = require('fs');
const path = require('path');
const tempalte_path = path.join(__dirname, "../templates");

const INCEPTION_DIALOG = 'inceptionDialog';
const MAIN_DIALOG = 'mainDialog';
const GENERAL_DIALOG = 'generalDialog';
const AWAITING_PAYMENT_DIALOG = 'awaitingPaymentDialog';
const TEXT_PROMPT = 'textPrompt';

const moyaPayToken = process.env.MOYA_PAY_TOKEN;

const storageAccount = "vumbotstorage";
const sharedKeyToken = process.env.sharedKeyToken;
const sharedKeyCredential = new StorageSharedKeyCredential(storageAccount, sharedKeyToken);
const policyScheduleBlobClient = new BlobServiceClient(
    `https://${storageAccount}.blob.core.windows.net/`,
    sharedKeyCredential
);
const clientNumber = "27632033786";

class InceptionDialog extends CancelAndHelpDialog {
    constructor(id, generalDialog, clientTableClient, policyNumberTableClient) {
        super(id, generalDialog, clientTableClient, policyNumberTableClient);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(generalDialog)
            .addDialog(new WaterfallDialog(INCEPTION_DIALOG, [
                this.moyaPayCheckStep.bind(this),
                this.coverOptionStep.bind(this),
                this.tradingNameStep.bind(this),
                this.businessNameStep.bind(this),
                this.businessPinLocationStep.bind(this),
                this.inceptionDateStep.bind(this),
                this.confirmStep.bind(this),
                this.checkDataChange.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = INCEPTION_DIALOG;
        this.clientTableClient = clientTableClient;
        this.policyNumberTableClient = policyNumberTableClient;
    }

    async moyaPayCheckStep(stepContext) {
        const clientDetails = stepContext.options;
        console.log(`ClientDetials in MoyaPayCheckStep: ${JSON.stringify(clientDetails)}`)
        console.log(`Result of !clientDetails.moyaPay: ${!clientDetails.moyaPay}`)
        if(clientDetails.moyaPay === undefined || clientDetails.moyaPay === ""){
            await stepContext.context.sendActivity('Thank you for you interest in our product, we have the following Cover Options available to you:\n\nStarter - R75.00\n- Stock and Contents: R30 000\n- Personal Accident: R25 000\n- Political Riot: R500 000\n\nStandard - R125.00\n- Stock and Contents: R50 000\n- Personal Accident: R25 000\n- Cell phone cover: R2 500\n- Political Riot: R500 000\n\nPremium - R195.00\n- Stock and Contents: R100 000\n- Personal Accident: R50 000\n- Cell phone cover: R5 000\n- Political Riot: R500 000');
            console.log("MoyaPay: undefined or empty if statement")
            let data = await moyaPayCheck(clientNumber)
            clientDetails.moyaPay = data.resultCode;
            clientDetails.moyaPayStatus = data.resultMessage;
        } else {
            let data = await moyaPayCheck(clientNumber)
            clientDetails.moyaPay = data.resultCode;
            clientDetails.moyaPayStatus = data.resultMessage
        }
        switch(clientDetails.moyaPay) {
            case 0:
                const messageText0 = 'We are sorry, but at the moment this product is exclusive to MoyaPay users. You can easily open a MoyaPay account by tapping here: moya://moya.payd or tap on the (?) button in MoyaPay for help with opening your account.';
                const msg0 = MessageFactory.text(messageText0, messageText0, InputHints.ExpectingInput);
                return await stepContext.prompt(TEXT_PROMPT, { prompt: msg0 });
            case 1:
                const messageText1 = 'At the moment this product is exclusive to MoyaPay users. Your MoyaPay account is currently being verified, once your account has been opened you will be able to continue the policy inception process.';
                const msg1 = MessageFactory.text(messageText1, messageText1, InputHints.ExpectingInput);
                return await stepContext.prompt(TEXT_PROMPT, { prompt: msg1 });
            case 2:
                return await stepContext.next(clientDetails.moyaPay);
            default:
                console.log("MoyaPay: default if statement")
                return await stepContext.next(clientDetails.moyaPay);
        }
     }

    async coverOptionStep(stepContext) {
        const clientDetails = stepContext.options;
        console.log(`ClientDetials in CoverOptionStep: ${JSON.stringify(clientDetails)}`)
        const result = stepContext.result;
        // Check the results, of MoyaPay check step
        switch (result) {
            case 0:              
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            case 1:
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            case 2:
                break;
            case 'start chat':
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            default:
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            }
        if (!clientDetails.coverOption) {
            const messageText = 'Please select a Cover Option?\nA - Starter\nB - Standard\nC - Premium';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
            }
        return await stepContext.next(clientDetails.coverOption);
        }

    async tradingNameStep(stepContext) {
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        // Check the results, of Cover Option step
        switch(result.toLowerCase()) {
            case 'a' || 'starter':
                clientDetails.coverOption = 'Starter';
                clientDetails.premium_incl_sasria  = 75;
                clientDetails.premium_nett_incl_sasria = 65.22;a
                clientDetails.premium_vat_incl_sasria = 9.78;
                clientDetails.premium_excl_sasria = 70;
                clientDetails.premium_nett_excl_sasria = 60.87;
                clientDetails.premium_vat_excl_sasria = 9.13;
                break;
            case 'b' || 'standard':
                clientDetails.coverOption = 'Standard';
                clientDetails.premium_incl_sasria = 125;
                clientDetails.premium_nett_incl_sasria = 108.70;
                clientDetails.premium_vat_incl_sasria = 16.30;
                clientDetails.premium_excl_sasria = 120;
                clientDetails.premium_nett_excl_sasria = 104.35;
                clientDetails.premium_vat_excl_sasria = 15.65;
                break;
            case 'c' || 'premium':
                clientDetails.coverOption = 'Premium';
                clientDetails.premium_incl_sasria = 195;
                clientDetails.premium_nett_incl_sasria = 169.57;
                clientDetails.premium_vat_incl_sasria = 25.43;
                clientDetails.premium_excl_sasria = 190;
                clientDetails.premium_nett_excl_sasria = 165.22;
                clientDetails.premium_vat_excl_sasria = 24.78;
                break;
            default:
                await stepContext.context.sendActivity("Please select a valid option");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        if (!clientDetails.hasTradingName) {
            const messageText = 'Do you have a business trading name?\nA - Yes\nB - No';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.hasTradingName);
    }

    async businessNameStep(stepContext) {
        console.log("BUSINESS NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;

        switch(result.toLowerCase()) {
            case 'a':
                clientDetails.hasTradingName = 'true';
                break;
            case 'b':
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
    }

    async businessPinLocationStep (stepContext) {
        console.log("BUSINESS PIN LOCATION STEP")
        const clientDetails = stepContext.options;
        clientDetails.businessName = stepContext.result;
        console.log(`CLIENT DETAILS from second Pin: ${JSON.stringify(clientDetails)}`)
        if (!clientDetails.pinCoords) {
            const messageText = 'Please provide your business location by sending a pin location in this chat.';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.pinCoords);
    }

    async inceptionDateStep (stepContext) {
        const clientDetails = stepContext.options;
        const extractPinCoords = await validateCoordinates(stepContext.result);
        if(!extractPinCoords) {
            await stepContext.context.sendActivity('The pin location you have provided is invalid');
            return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        } else {
            console.log(`EXTRACTED PIN COORDS: ${extractPinCoords}`)
            clientDetails.pinCoords = String(extractPinCoords);
            if (!clientDetails.pinCoords || !clientDetails.googlePlus || !clientDetails.what3Words) {
                const googleMapsData = await getAPIData("https://maps.googleapis.com/maps/api/geocode/json",`latlng=${extractPinCoords}`,"key=AIzaSyAOsCoUnJLbldWCDjmeISoL5YwIaWzGGkU");
                const what3WordsData = await getAPIData("https://api.what3words.com/v3/convert-to-3wa",`coordinates=${extractPinCoords}`,"key=MVIU0YCZ");
                clientDetails.googlePlus = googleMapsData.plus_code.global_code;
                clientDetails.what3Words = what3WordsData.words;
                clientDetails.street = googleMapsData.results[0].address_components[1].long_name;
                clientDetails.suburb = googleMapsData.results[0].address_components[2].long_name;
                clientDetails.area = googleMapsData.results[0].address_components[3].long_name;
                clientDetails.province = googleMapsData.results[0].address_components[5].long_name;
                clientDetails.postalCode = googleMapsData.results[0].address_components[6].long_name;
                };
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
        const clientDetails = stepContext.options;
        console.log(`CLIENT DETAILS from confirm step: ${JSON.stringify(clientDetails)}`)
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
                    await stepContext.context.sendActivity("Please select a valid option.");
                    return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
                }
            }
        const messageText = `Please confirm the following information:\nCover Option: ${clientDetails.coverOption}\nBusiness Name: ${clientDetails.businessName}\nBusiness Location: ${clientDetails.pinCoords}\nInception Date: ${clientDetails.inceptionDate}\nA - Correct Information\nB - Incorrect Information`;
        const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
    }

    async checkDataChange(stepContext) {
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        switch (result.toLowerCase()) {
            case "a":
                return await stepContext.next(clientDetails);
            case "b":
                return await stepContext.context.sendActivity("Please indicate the incorrect information:\nA - Cover Option\nB - Business Name\nC - Business Location\nD - Inception Date");
            default:
                await stepContext.context.sendActivity("Please select a valid option.");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
    }

    async finalStep(stepContext) {
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        if(!isObject(result)){
            switch (result.toLowerCase()) {
                case "a":
                    clientDetails.coverOption = null;
                    break;
                case "b":
                    clientDetails.businessName = null;
                    break;
                case "c":
                    clientDetails.pinCoords = null;
                    break;
                case "d":
                    clientDetails.inceptionDate = null;
                    break;
                default:
                    await stepContext.context.sendActivity("Please select a valid option.");
                    return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            }
            return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }
        clientDetails.dataPopulated = true;
        // let proRataText = "";
        console.log(`\n\nCLIENT DATA: ${JSON.stringify(clientDetails)}\n\n`);
        await postRequest(`https://vum-webapp-node.azurewebsites.net/populatePolicyData/`,clientNumber, clientDetails)
        .then((response) => {
            Object.assign(clientDetails, response.data);
            })
            .catch((error) => {
                // console.log(error)
            });
        let proRataText = "";
        if (clientDetails.pro_rata) {
            proRataText = `the pro rata and the first months premium of R ${clientDetails.premium_due}`;
        } else {
            proRataText = `the first months premium of R ${clientDetails.premium_due}`;
        }
        await stepContext.context.sendActivity(`Thank you for choosing us for your Business Insurance Needs, your Policy Number is ${clientDetails.policyNumber}.\nYour Policy has been incepted, and cover will only become fully active when your pay ${proRataText}`);
        return await stepContext.beginDialog(MAIN_DIALOG, clientDetails);
    }
}

async function moyaPayCheck(clientNumber){
    return new Promise(async (resolve, reject) => {
        let config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: `https://payments.api.dev.moyapayd.app/customers/${clientNumber}/check`,
          headers: {
            'Authorization': `Bearer ${moyaPayToken}`, 
          },
        };
    
        try {
          const response = await axios.request(config);
          console.log(response.data);
          resolve(response.data);
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
}

async function postRequest(endpoint, parameters, data){
    return new Promise(async (resolve, reject) => {
        try {
            const url = endpoint + parameters;
            const response = await axios.post(url, data, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
      
            resolve(response.data);
          } catch (error) {
            // console.error('Error while making the POST request:', error);
            reject(error);
          }
        });
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

function formatString(dateParam){
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

async function getNextPolicyNumber(policyNumberTableClient) {
    while (true) {
      try {
        // Retrieve the entity containing the latest policy number
        const entity = await policyNumberTableClient.getEntity("newPolicyNumberPK", "newPolicyNumberRK");
        console.log(`E-Tag: ${entity.etag}`)    
        // Increment the policy number
        const newPolicyNumber = parseInt(entity.policyNumber) + 1;

        // Update the entity with the new policy number
        await policyNumberTableClient.updateEntity(
          { ...entity, policyNumber: newPolicyNumber.toString() },
          'Replace',
          { etag: entity.etag }
        );
        
        // 
        
        // Return the new policy number
        return newPolicyNumber;
      } catch (error) {
        // If the update operation fails due to an ETag mismatch, retry the process
        if (error.statusCode === 412) {
          console.log('ETag mismatch, retrying...');
          continue;
        }
  
        // If an error other than an ETag mismatch occurs, throw the error
        throw error;
      }
    }
}

function formatCurrency(num){
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2
        });
    const formattedNum = formatter.format(num);
    return formattedNum.replace('ZAR', 'R ');
}

async function getAndFillPDF(policyScheduleBlobClient, clientObject, filename){
    const outputContainerName = "policy-schedules";
    const today = formatString(new Date());
    console.log(`Today's date: ${today}`)
    console.log("getAndFillPDF")
    const pdfDoc = 
        await PDFDocument.load(
            fs.readFileSync(
                path.join(
                    tempalte_path, 
                    'Santam Emerging Business Insurance Policy Schedule - Template.pdf'
                    )
                )
            );
    
    const form = pdfDoc.getForm();
    const policyNumber = form.getTextField('PolicyNumber');
    const inceptioNDate = form.getTextField('InceptionDate');
    const insured = form.getTextField('Insured');
    const cellNumber = form.getTextField('CellNumber');
    const googlePlusCode = form.getTextField('Google Plus Code');
    const what_3_Words = form.getTextField('What3Words');
    const policyPremiumNett = form.getTextField('PolicyPremiumNett');
    const policyPremiumVat = form.getTextField('PolicyPremiumVat');
    const PolicyPremiumTotal = form.getTextField('PolicyPremiumTotal');
    const sasriaNett = form.getTextField('SasriaNett');
    const sasriaVat = form.getTextField('SasriaVat');
    const sasriaTotal = form.getTextField('SasriaTotal');
    const totalNett = form.getTextField('TotalNett');
    const totalVat = form.getTextField('TotalVat');
    const total = form.getTextField('Total');
    const date = form.getTextField('Date');
    const datePrinted1 = form.getTextField('DatePrinted1');
    const datePrinted2 = form.getTextField('DatePrinted2');
    const datePrinted3 = form.getTextField('DatePrinted3');
    const datePrinted4 = form.getTextField('DatePrinted4');
    const datePrinted5 = form.getTextField('DatePrinted5');
    const datePrinted6 = form.getTextField('DatePrinted6');
    const descriptionGooglePlusCode = form.getTextField('DescriptionGoogle Plus Code');
    const descriptionWhat3Words = form.getTextField('DescriptionWhat3Words');
    const descriptionBusinessAddress = form.getTextField('DescriptionBusiness Address');
    const descriptionAreaOrSuburb = form.getTextField('DescriptionArea or Suburb');
    const descriptionPostalCode = form.getTextField('DescriptionPostal Code');
    const descriptionProvinceOrRegion = form.getTextField('DescriptionProvince or Region');
    const descriptionBusinessActivity = form.getTextField('DescriptionBusiness Activity');
    const decscriptionCoverOptionChosen = form.getTextField('DescriptionCover Option Chosen'); 
    const descriptionSumInsured = form.getTextField('DescriptionSum Insured');
    const descriptionInsuredName = form.getTextField('DescriptionInsured Name');
    const descriptionIDOrPassportNumber = form.getTextField('DescriptionID or Passport Number');
    const descriptionNationality = form.getTextField('DescriptionNationality');
    const descriptionPASumInsured = form.getTextField('DescriptionSum Insured_2');
    const descriptionMake = form.getTextField('DescriptionMake');
    const descriptionModel = form.getTextField('DescriptionModel');
    const descriptionSerialNumber = form.getTextField('DescriptionSerial Number');
    const descriptionSumInsured_3 = form.getTextField('DescriptionSum Insured_3');

    policyNumber.setText(clientObject.policyNumber.toString());
    inceptioNDate.setText(clientObject.inceptionDate.toString());
    insured.setText(clientObject.businessName);
    cellNumber.setText('082 123 4567');
    googlePlusCode.setText(clientObject.googlePlus);
    what_3_Words.setText(clientObject.what3Words);
    policyPremiumNett.setText(formatCurrency(clientObject.premium_nett_excl_sasria));
    policyPremiumVat.setText(formatCurrency(clientObject.premium_vat_excl_sasria));
    PolicyPremiumTotal.setText(formatCurrency(clientObject.premium_excl_sasria));
    sasriaNett.setText('R 4.35');
    sasriaVat.setText('R 0.65');
    sasriaTotal.setText('R 5.00');
    totalNett.setText(formatCurrency(clientObject.premium_nett_incl_sasria));
    totalVat.setText(formatCurrency(clientObject.premium_vat_incl_sasria));
    total.setText(formatCurrency(clientObject.premium_incl_sasria));
    date.setText(today);
    console.log("FIRST PAGE DONE")
    datePrinted1.setText(`Printed on: ${today}`);
    datePrinted2.setText(`Printed on: ${today}`);
    datePrinted3.setText(`Printed on: ${today}`);
    datePrinted4.setText(`Printed on: ${today}`);
    datePrinted5.setText(`Printed on: ${today}`);
    datePrinted6.setText(`Printed on: ${today}`);
    descriptionGooglePlusCode.setText(clientObject.googlePlus);
    descriptionWhat3Words.setText(clientObject.what3Words);
    descriptionBusinessAddress.setText(clientObject.street);
    descriptionAreaOrSuburb.setText(clientObject.suburb);
    descriptionPostalCode.setText(clientObject.postalCode);
    descriptionProvinceOrRegion.setText(clientObject.province);
    descriptionBusinessActivity.setText('Business Activity');
    decscriptionCoverOptionChosen.setText(clientObject.coverOption);
    descriptionSumInsured.setText('R 1 000.00');
    descriptionInsuredName.setText('John Doe');
    descriptionIDOrPassportNumber.setText('123456789');
    descriptionNationality.setText('South African');
    descriptionPASumInsured.setText('R 1 000.00');
    descriptionMake.setText('Make');
    descriptionModel.setText('Model');
    descriptionSerialNumber.setText('Serial Number');
    descriptionSumInsured_3.setText('R 1 000.00');

    console.log("FORM FINISHED")
    form.flatten();

    const pdfBytes_output = await pdfDoc.save();

    const containerClient = policyScheduleBlobClient.getContainerClient(outputContainerName);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.upload(pdfBytes_output, pdfBytes_output.length);
    
    const sasToken = generateBlobSasUrl(filename, outputContainerName);

    return sasToken;
}

function generateBlobSasUrl(blobName, containerName, expiresInDays = 180) {
    const now = new Date();
    const expiresOn = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  
    const sasPermissions = new BlobSASPermissions();
    sasPermissions.read = true;
  
    const sasQueryParameters = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: sasPermissions,
        startsOn: now,
        expiresOn,
        protocol: SASProtocol.Https,
      },
      sharedKeyCredential
    );
  
    const sasToken = sasQueryParameters.toString();
    const sasUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
  
    return sasUrl;
}

function getProRataAmount(inceptionDateChosen, totalPremiumInclSasria){
    const date = new Date(inceptionDateChosen);
    let pro_rata = true;
    let premium_due = 0;
    if(date.getDate() < 10){
        pro_rata = false;
        premium_due = totalPremiumInclSasria;
        return {pro_rata, premium_due};
    } else {
        // calculate the days remaining in the current month
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const nextMonthFirstDay = new Date(year, month, 1);

        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const differenceInMilliseconds = nextMonthFirstDay - date;
        const daysRemaining = Math.floor(differenceInMilliseconds / millisecondsPerDay);

        // calculate the pro rata amount
        premium_due = totalPremiumInclSasria + (((totalPremiumInclSasria * 12)/365) * daysRemaining); 
        premium_due = parseFloat(premium_due.toFixed(2));
        return {pro_rata, premium_due};
    }
}

function isObject(value) {
    return typeof value === 'object' && value !== null && !(value instanceof Array);
}


module.exports.InceptionDialog = InceptionDialog;