const axios = require('axios');
const { InputHints, MessageFactory, ActivityTypes, AttachmentLayoutTypes } = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const {PDFDocument} = require('pdf-lib');

const fs = require('fs');
const path = require('path');
const tempalte_path = path.join(__dirname, "../templates");

const INCEPTION_DIALOG = 'inceptionDialog';
const GENERAL_DIALOG = 'generalDialog';
const TEXT_PROMPT = 'textPrompt';

class InceptionDialog extends CancelAndHelpDialog {
    constructor(id, generalDialog, clientTableClient, policyNumberTableClient, policyScheduleBlobClient) {
        super(id, generalDialog, clientTableClient, policyNumberTableClient, policyScheduleBlobClient);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(generalDialog)
            .addDialog(new WaterfallDialog(INCEPTION_DIALOG, [
                this.coverOptionStep.bind(this),
                this.tradingNameStep.bind(this),
                this.businessNameStep.bind(this),
                this.businessPinLocationStep.bind(this),
                this.inceptionDateStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = INCEPTION_DIALOG;
        this.clientTableClient = clientTableClient;
        this.policyNumberTableClient = policyNumberTableClient;
        this.policyScheduleBlobClient = policyScheduleBlobClient;
    }

    async coverOptionStep(stepContext) {
        console.log("STARTING AGAIN")
        const clientDetails = stepContext.options;
        console.log(`CLIENT DETAILS: ${JSON.stringify(clientDetails)}`)
        if (!clientDetails.coverOption) {
            const messageText = 'Please select a Cover Option?\n\nA - Starter\n\nB - Standard\n\nC - Premium';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.coverOption);
    }

    async tradingNameStep(stepContext) {
        console.log("TRADING NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;

        switch(result.toLowerCase()) {
            case 'a':
                clientDetails.coverOption = 'Starter';
                clientDetails.premium_incl_sasria  = 75;
                clientDetails.premium_nett_incl_sasria = 65.22;
                clientDetails.premium_vat_incl_sasria = 9.78;
                clientDetails.premium_excl_sasria = 70;
                clientDetails.premium_nett_excl_sasria = 60.87;
                clientDetails.premium_vat_excl_sasria = 9.13;
                break;
            case 'b':
                clientDetails.coverOption = 'Standard';
                clientDetails.premium_incl_sasria = 125;
                clientDetails.premium_nett_incl_sasria = 108.70;
                clientDetails.premium_vat_incl_sasria = 16.30;
                clientDetails.premium_excl_sasria = 120;
                clientDetails.premium_nett_excl_sasria = 104.35;
                clientDetails.premium_vat_excl_sasria = 15.65;
                break;
            case 'c':
                clientDetails.coverOption = 'Premium';
                clientDetails.premium_incl_sasria = 195;
                clientDetails.premium_nett_incl_sasria = 169.57;
                clientDetails.premium_vat_incl_sasria = 25.43;
                clientDetails.premium_excl_sasria = 190;
                clientDetails.premium_nett_excl_sasria = 165.22;
                clientDetails.premium_vat_excl_sasria = 24.78;
                break;
            default:
                await stepContext.context.sendActivity("Please select a valid option.....");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
        }

        if (!clientDetails.hasTradingName) {
            const messageText = 'Do you have a trading name?\n\nA - Yes\n\nB - No';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.hasTradingName);
    }

    async businessNameStep(stepContext) {
        console.log("BUSINESS NAME STEP")
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        if(!clientDetails.hasTradingName) {
            if (result === "A" || result === "a") {
                clientDetails.hasTradingName = "true";
            } else if (result === "B" || result === "b") {
                clientDetails.hasTradingName = "false";
                clientDetails.businessName = "CHANGE TO USER NAME";
            } else if (result===""){
                // Do Nothing
            } else {
                await stepContext.context.sendActivity("Please select a valid option.");
                return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
            }
        } 
        if (!clientDetails.businessName) {
            const messageText = 'Please enter your trading name?';
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
            const messageText = 'Please provide your business pin location.';
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
            const currentDate = await dateString(today);
            const tomorrowDate = await dateString(tomorrow);
            if (today.getMonth() == 11) {
                var firstNextMonth = new Date(today.getFullYear() + 1, 0, 1);
            } else {
                var firstNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            }
            firstNextMonth = await dateString(firstNextMonth);
            const messageText = `Please select the date your would like to Incept you policy. \n\nA - Today (${currentDate})\n\nB - Tomorrow (${tomorrowDate})\n\nC - The 1st of Next Month (${firstNextMonth})`;
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(clientDetails.inceptionDate);
    };

    async finalStep(stepContext) {
        const clientDetails = stepContext.options;
        const result = stepContext.result;
        if (!clientDetails.inceptionDate) {
            const today =  new Date();
            switch(result.toLowerCase()) {
                case "a":
                    clientDetails.inceptionDate = today;
                    break;
                case "b":
                    let tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    clientDetails.inceptionDate = tomorrow;
                    break;
                case "c":
                    if (today.getMonth() == 11) {
                        var firstNextMonth = new Date(today.getFullYear() + 1, 0, 1);
                    } else {
                        var firstNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    }
                    clientDetails.inceptionDate = firstNextMonth;
                    break;
                case "":
                    // Do Nothing
                    break;
                default:
                    await stepContext.context.sendActivity("Please select a valid option.");
                    return await stepContext.beginDialog(INCEPTION_DIALOG, clientDetails);
                }
            }
        clientDetails.policyNumber = await getNextPolicyNumber(this.policyNumberTableClient);
        clientDetails.incepted = true;
        const policySchedulePDF = await getAndFillPDF(this.policyScheduleBlobClient, clientDetails);
        policySchedulePDF.toString('base64');
        const attachment = {
            contentType: 'application/pdf',
            contentUrl: `data:application/pdf;base64,${policySchedulePDF}`,
            name: `Santam Emerging Business Insurance Policy Schedule - ${clientDetails.policyNumber}.pdf`,
          };
        const reply = {
            type: ActivityTypes.Message,
            text: 'Here is your PDF file:',
            attachments: [attachment],
            attachmentLayout: AttachmentLayoutTypes.list,
        };
        await stepContext.context.sendActivity(reply);
        await this.clientTableClient.updateEntity(clientDetails);
        await stepContext.context.sendActivity(`INCEPTION STEP: \n\nThe information you have provided is as follows:\n\nPolicy Number: ${clientDetails.policyNumber}\n\nCover Option: ${clientDetails.coverOption}\n\nBusiness Name: ${clientDetails.businessName}\n\nPin Location: ${clientDetails.pinCoords}\n\nGoogle Plus: ${clientDetails.googlePlus}\n\nWhat3Words: ${clientDetails.what3Words}\n\nStreet: ${clientDetails.street}\n\nArea: ${clientDetails.area}\n\nSuburb: ${clientDetails.suburb}\n\nPostal_Code: ${clientDetails.postalCode}\n\nProvince: ${clientDetails.province}\n\nInception Date: ${clientDetails.inceptionDate}`);
        return await stepContext.beginDialog(GENERAL_DIALOG, clientDetails);
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

async function dateString(dateParam){
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

async function getAndFillPDF(policyScheduleBlobClient, clientObject){
    // console.log("getAndFillPDF")
    // const templateContainerClient = policyScheduleBlobClient.getContainerClient("templates"); 
    // const templateBlobClient = templateContainerClient.getBlobClient("Santam Emerging Business Insurance Policy Schedule - Template.pdf");
    // const data = await templateBlobClient.downloadToBuffer();
    // const pdfDoc = await PDFDocument.load(data);

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

    console.log(`Client Object: ${JSON.stringify(clientObject)}`)
    policyNumber.setText(clientObject.policyNumber.toString());
    inceptioNDate.setText(clientObject.inceptionDate.toString());
    insured.setText(clientObject.businessName);
    cellNumber.setText('082 123 4567');
    googlePlusCode.setText(clientObject.googlePlus);
    what_3_Words.setText(clientObject.what3Words);
    console.log("TOP BLOCK DONE")
    console.log(`Premium nett excl sasria: ${clientObject.premium_nett_excl_sasria}`)
    policyPremiumNett.setText(formatCurrency(clientObject.premium_nett_excl_sasria));
    console.log(`Premium vat excl sasria: ${clientObject.premium_vat_excl_sasria}`)
    policyPremiumVat.setText(formatCurrency(clientObject.premium_vat_excl_sasria));
    console.log(`Premium excl sasria: ${clientObject.premium_excl_sasria}`)
    PolicyPremiumTotal.setText(formatCurrency(clientObject.premium_excl_sasria));
    sasriaNett.setText('R 0.65');
    sasriaVat.setText('R 4.35');
    sasriaTotal.setText('R 5.00');
    console.log(`Premium nett incl sasria: ${clientObject.premium_nett_incl_sasria}`)
    totalNett.setText(formatCurrency(clientObject.premium_nett_incl_sasria));
    console.log(`Premium vat incl sasria: ${clientObject.premium_vat_incl_sasria}`)
    totalVat.setText(formatCurrency(clientObject.premium_vat_incl_sasria));
    console.log(`Premium incl sasria: ${clientObject.premium_incl_sasria}`)
    total.setText(formatCurrency(clientObject.premium_incl_sasria));
    date.setText('01/06/2023');
    console.log("FIRST PAGE DONE")
    datePrinted1.setText('Printed on: 01/06/2023');
    datePrinted2.setText('Printed on: 01/06/2023');
    datePrinted3.setText('Printed on: 01/06/2023');
    datePrinted4.setText('Printed on: 01/06/2023');
    datePrinted5.setText('Printed on: 01/06/2023');
    datePrinted6.setText('Printed on: 01/06/2023');
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

    fs.writeFileSync(path.join(__dirname,`../policy_schedules/Santam Emerging Business Insurance Policy Schedule - ${clientObject.policyNumber}.pdf`), pdfBytes_output);

    // const policyScheduleName = `Santam Emerging Business Insurance Policy Schedule.pdf`;
    // const policyContainerClient = policyScheduleBlobClient.getContainerClient("policy-schedules");
    // const policyBlobClient = policyContainerClient.getBlockBlobClient(policyScheduleName);
    // await policyBlobClient.upload(pdfBytes_output, pdfBytes_output.length)
    return pdfBytes_output;
}


module.exports.InceptionDialog = InceptionDialog;