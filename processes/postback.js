const request = require("request");
const axios = require("axios");
const fb = require("fb");

module.exports = function processPostback(event) {
  let _locationText;
  const senderID = event.sender.id;
  const payload = event.postback.payload;
  const url =
    "https://graph.facebook.com/v15.0/me/messages?access_token=" +
    process.env.PAGE_ACCESS_TOKEN;
    
    console.log("SENDER ID: ", senderID);
    console.log("PAYLOAD: ", payload);

  function _menuFunc(){
    const messageData = {
      recipient: {
        id: senderID,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "Hi Sir, How can we assist you?",
            buttons: [
              {
                type: "postback",
                title: "Verify OTP",
                payload: "VERIFY_OTP_PAYLOAD",
              },
              {
                type: "postback",
                title: "Get Repayment Info",
                payload: "REPAYMENT_INFO_PAYLOAD",
              },
              {
                type: "postback",
                title: "Locations",
                payload: "LOCATIONS_PAYLOAD",
              },
            ],
          },
        },
      },
    };
    request({
      uri: url,
      method: "POST",
      json: messageData,
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        console.log("[+] Button template sent successfully");
      } else {
        console.error("[-] Error sending button template:", err || body.error);
      }
    });
  }

  async function _locationFunc(){
    let names = [];
    let resLocations = [];
    let workHours = [];
    try {
      const resp = await axios.post(
        "http://35.88.61.60/middleware/terminals/getLocations"
      );
      const locations = resp.data.data;
      for (const location of locations) {
        const { name, location: resLocation, working_hours } = location;
        names.push(name);
        resLocations.push(resLocation);
        workHours.push(working_hours);
      }
    } catch (err) {
      console.log(err);
    }
    _locationText = names.reduce((acc, name, index) => {
      const location = resLocations[index];
      const hours = workHours[index];
      return acc + `\n${name}, Locations: ${location}, Work Hours: ${hours}\n`;
    }, "");
    const locOptions = {
      url: url,
      method: "POST",
      json: true,
      body: {
        recipient: {
          id: senderID,
        },
        message: {
          text: `${_locationText}`,
        },
      },
    };
    request.post(locOptions, (err) => {
      console.log("[+] LOCATION SENT");
    });
  }

  function _repayment(){
    const locOptions = {
      url: url,
      method: "POST",
      json: true,
      body: {
        recipient: {
          id: senderID,
        },
        message: {
          text: "Please send your phone number here.\nEx: 88855552222",
        },
      },
    };
    request.post(locOptions, (err) => {
      if(err){
        console.log("REPAYMENT INFO ERROR: ", err)
      }
      console.log("[+] REPAYMENT INFO SENT");
    });
  }

  function _verifyOtp(){
    const otpOptions = {  
      url: url,
      method: "POST",
      json: true,
      body: {
        recipient: {
          id: senderID,
        },
        message: {
          text: `Enter your phone number and otp as follows:\n{Phone Number}, {OTP}`,
        },
      },
    };
    request.post(otpOptions, (err) => {
      if(err){
        console.log("OTP ERROR > ", err)
      }
      console.log("[+] REPAYMENT INFO SENT");
    });
  }

  if (payload === "GET_STARTED_PAYLOAD") {
    _menuFunc()
  }
  if (payload === "LOCATIONS_PAYLOAD") {
    _locationFunc()
    _menuFunc()
  }
  if (payload === "VERIFY_OTP_PAYLOAD"){
    _verifyOtp()
  }
  if (payload === "REPAYMENT_INFO_PAYLOAD"){
    _repayment()
  }
};
