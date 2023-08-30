const request = require("request");
const axios = require("axios");
const fb = require("fb");
require("dotenv").config();
fb.setAccessToken(process.env.PAGE_ACCESS_TOKEN);

module.exports = async function processMessage(event) {
  if (event.message.is_echo) return;

  const { sender, message } = event;
  const { id: senderID } = sender;
  const { text: number } = message;

  const numRegex = /^(\+?\d{1,2}\s?)?(\d{3}|\(\d{3}\))[\s.-]?\d{3}[\s.-]?\d{3,4}$/;
  const verifyRegex = /[, ]+/;

  const url = `https://graph.facebook.com/v15.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const nameUrl = `https://graph.facebook.com/${senderID}?fields=name,profile_pic&access_token=${process.env.PAGE_ACCESS_TOKEN}`;

  let debt = null;
  let expireDate = null;
  let clientName = "";
  let clientProUrl = "";
  let message_id = "";

  // JUST FETCHING SECTION NO NEED TO UNFOLD
  try { 
    const options = {
      url: `https://graph.facebook.com/v15.0/${senderID}/conversations`,
      params: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
      },
    };
    const response = await axios(options);
    const { data } = response;
    message_id = data.data[0].link;
  } catch (err) {
    console.error("Error fetching conversation data:", err);
  }
  try {
    const { data } = await axios.get(nameUrl);
    clientName = data.name;
    clientProUrl = data.profile_pic;
  } catch (err) {
    console.error("Error fetching client data:", err);
  }

  function _loanCheck(phoneNum){
    const backurl = "http://35.88.61.60/middleware/loans/getByPhone";
    const backOptions = {
      url: backurl,
      method: "POST",
      json: {
        phone: number,
        psid: senderID,
        name: clientName,
        profile_pic: clientProUrl,
        message_id: message_id,
      },
    };

    request.post(backOptions, (err, body) => {
      if (err) {
        console.error("Error posting to backend:", err);
        return;
      }else{
        console.log(JSON.stringify(body));
        const obj = JSON.parse(JSON.stringify(body));
        console.log("OBJECT DATA: ", obj)
      }
  
      try {
        debt = obj.body.data.repayment.current_pay_amount;
        expireDate = obj.body.data.repayment.current_pay_date;
        console.log("FETCHING USER LOAN FROM DB", debt, expireDate)
      } catch (err) {
        debt = null;
      }
    });
  }
  function _messageSender(msg){
    const _opts = {
      url: url,
      method: "POST",
      json: true,
      body: {
        recipient: {
          id: senderID,
        },
        message: {
          text: msg,
        },
      },
    };
    request.post(_opts, (err) => {
      if(err){
        console.log("ERROR", err)
      }
      console.error("[+] SENT MSG");
    });
  }
  if(message){
    console.log("[!] GOT MESSAGE > ", message)
    if (numRegex.test(message) && message.length < 13 && message.length >= 10 ) {
      if(_loanCheck(message)){
        console.log("USER HAS LOAN")
        msg = "YOU HAVE LOAN"
        _messageSender(msg)
      }
    }
    else if (message.length > 15 && message.length < 21 && verifyRegex.test(message)) {
      const otpNum = message.split(/[, ]+/);
      // OPTIONS TO VERIFY OTP
      const sendOtp = {
        url: "http://35.88.61.60/middleware/clients/verify-otp",
        method: "POST",
        json: true,
        body: {
          phone: `${otpNum[0]}`,
          otp: `${otpNum[1]}`,
          psid: senderID,
          name: clientName,
          profile_pic: clientProUrl,
          message_id: message_id,
        },
      };
      console.log("MESSAGE > ", message)

      request.post(sendOtp, (err, res) => {
        if (res.statusCode != 400) {
          const rightOTP = {
            url: url,
            method: "POST",
            json: true,
            body: {
              recipient: {
                id: senderID,
              },
              message: {
                text: `OTP Verified`,
              },
            },
          };
          request.post(rightOTP, (err) => {
            console.log("[+] OTP VERIFIED");
          });
        } else {
          const rightOTP = {
            url: url,
            method: "POST",
            json: true,
            body: {
              recipient: {
                id: senderID,
              },
              message: {
                text: `Wrong OTP`,
              },
            },
          };
          request.post(rightOTP, (err) => {
            console.error("[!] Wrong OTP");
          });
        }
      });
    } else {
      const options = {
        url: url,
        method: "POST",
        json: true,
        body: {
          recipient: {
            id: senderID,
          },
          message: {
            text: `Your debt: ${debt}\nYour expire date: ${expireDate}`,
          },
        },
      };
      request.post(options, (err) => {
        if (err) {
          console.error("DEBT ERROR: ", err);
        }
        console.log("[+] DEBT GONE");
      });
    }
  }
}